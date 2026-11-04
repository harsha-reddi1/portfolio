import json
import re
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .auth import (
    create_access_token,
    get_current_admin,
    hash_password,
    verify_password,
)
from .database import Base, engine, get_db, SessionLocal
from .models import (
    AdminUser,
    Award,
    BlogPost,
    Certification,
    ContactMessage,
    Education,
    Experience,
    Profile,
    Project,
    Skill,
    AiInsight,
)
from .schemas import (
    AdminLogin,
    AwardCreate,
    AwardOut,
    AwardUpdate,
    CertificationCreate,
    CertificationOut,
    CertificationUpdate,
    ContactMessageCreate,
    ContactMessageOut,
    EducationCreate,
    EducationOut,
    EducationUpdate,
    ExperienceCreate,
    ExperienceOut,
    ExperienceUpdate,
    PasswordChange,
    PortfolioFullData,
    ProfileOut,
    ProfileUpdate,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    SkillCreate,
    SkillOut,
    SkillUpdate,
    Token,
    BlogPostCreate,
    BlogPostUpdate,
    BlogPostOut,
    AiInsightBase,
    AiInsightCreate,
    AiInsightOut,
)
from .seed import populate_from_resume_payload, seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: safely create tables and seed default data
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    except Exception as e:
        print(f"Lifespan database initialization warning: {e}")
    yield


app = FastAPI(
    title="Developer Portfolio & Blog API",
    description="FastAPI + PostgreSQL / SQLite backend for personal portfolio and content management.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def normalize_vercel_path(request: Request, call_next):
    # Check for __path__ passed by Vercel rewrite
    override_path = request.query_params.get("__path__")
    if override_path:
        clean_override = "/" + override_path.lstrip("/")
        request.scope["path"] = clean_override
    else:
        matched = request.headers.get("x-matched-path") or request.headers.get("x-forwarded-uri")
        if matched and matched not in ["/api/index.py", "/index.py"]:
            request.scope["path"] = matched.split("?")[0]
        else:
            path = request.scope.get("path", "")
            for prefix in ["/api/index.py", "/index.py"]:
                if path.startswith(prefix) and len(path) > len(prefix):
                    request.scope["path"] = path[len(prefix):]
                    break
    return await call_next(request)


# Locate frontend dist directory across local and Vercel serverless environments
_backend_app_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.dirname(os.path.dirname(_backend_app_dir))
_possible_dist_dirs = [
    os.path.join(_repo_root, "frontend", "dist"),
    os.path.join(os.getcwd(), "frontend", "dist"),
    "/var/task/frontend/dist",
]
_dist_dir = next((d for d in _possible_dist_dirs if os.path.exists(d)), os.path.join(_repo_root, "frontend", "dist"))

# Mount assets directory if available
if os.path.exists(_dist_dir):
    _assets_dir = os.path.join(_dist_dir, "assets")
    if os.path.exists(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")


@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    path = request.url.path
    # For non-API routes, fallback to frontend index.html for Single Page Application routing
    if not path.startswith("/api") and os.path.exists(_dist_dir):
        index_file = os.path.join(_dist_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Not Found",
            "path": request.url.path,
            "scope_path": request.scope.get("path"),
        },
    )


# -----------------------------
# Public Endpoints
# -----------------------------

@app.get("/")
@app.get("/index.html")
async def serve_root():
    if os.path.exists(_dist_dir):
        index_file = os.path.join(_dist_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    from .database import db_status
    return {
        "status": "healthy",
        "app": "Portfolio & Blog API",
        "database": db_status.get("type", "SQLite"),
        "db_connected": db_status.get("connected", False),
    }


@app.get("/favicon.svg")
async def serve_favicon():
    fav = os.path.join(_dist_dir, "favicon.svg")
    if os.path.exists(fav):
        return FileResponse(fav)
    raise HTTPException(status_code=404, detail="Favicon not found")


@app.get("/icons.svg")
async def serve_icons():
    ico = os.path.join(_dist_dir, "icons.svg")
    if os.path.exists(ico):
        return FileResponse(ico)
    raise HTTPException(status_code=404, detail="Icons not found")


@app.get("/api")
@app.get("/api/")
def root():
    from .database import db_status
    return {
        "status": "healthy",
        "app": "Portfolio & Blog API",
        "database": db_status.get("type", "SQLite"),
        "db_connected": db_status.get("connected", False),
    }


@app.get("/health")
@app.get("/api/health")
def health_check():
    from .database import db_status
    return {
        "status": "healthy",
        "app": "Portfolio & Blog API",
        "database": db_status.get("type", "SQLite"),
        "db_connected": db_status.get("connected", False),
        "db_error": db_status.get("error"),
        "db_host": db_status.get("host"),
        "db_port": db_status.get("port"),
        "db_user": db_status.get("user"),
        "db_masked_url": db_status.get("masked_url"),
        "db_attempts": db_status.get("attempts", []),
    }


@app.get("/portfolio", response_model=PortfolioFullData)
@app.get("/api/portfolio", response_model=PortfolioFullData)
def get_portfolio_data(db: Session = Depends(get_db)):
    profile = db.query(Profile).first()
    experiences = db.query(Experience).order_by(Experience.display_order.asc(), Experience.id.asc()).all()
    projects = db.query(Project).order_by(Project.display_order.asc(), Project.id.asc()).all()
    skills = db.query(Skill).order_by(Skill.category.asc(), Skill.display_order.asc()).all()
    education = db.query(Education).all()
    awards = db.query(Award).order_by(Award.display_order.asc()).all()
    certifications = db.query(Certification).order_by(Certification.display_order.asc()).all()
    posts = db.query(BlogPost).filter(BlogPost.is_published == True).order_by(BlogPost.created_at.desc()).all()
    ai_insights = db.query(AiInsight).order_by(AiInsight.display_order.asc(), AiInsight.id.asc()).all()

    # Filter out Harsha's default blog posts if profile is for a different candidate
    is_harsha = profile and "harsha" in (profile.name or "").lower()
    if not is_harsha:
        posts = [p for p in posts if "harsha" not in (p.content or "").lower() and "pyspark" not in (p.content or "").lower()]

    return PortfolioFullData(
        profile=profile,
        experiences=experiences,
        projects=projects,
        skills=skills,
        education=education,
        awards=awards,
        certifications=certifications,
        posts=posts,
        ai_insights=ai_insights,
    )


@app.post("/contact")
@app.post("/api/contact")
def submit_contact_message(msg: ContactMessageCreate, db: Session = Depends(get_db)):
    db_msg = ContactMessage(
        name=msg.name,
        email=msg.email,
        subject=msg.subject or "Portfolio Inquiry",
        message=msg.message,
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return {
        "status": "success",
        "message": f"Thank you {msg.name}! Your message has been received.",
        "id": db_msg.id,
    }


# -----------------------------
# Authentication Endpoints
# -----------------------------

@app.post("/auth/login", response_model=Token)
@app.post("/api/auth/login", response_model=Token)
def login(form_data: AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.username == form_data.username).first()
    if not admin or not verify_password(form_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token(data={"sub": admin.username})
    return Token(access_token=token, token_type="bearer", username=admin.username)


@app.get("/auth/me")
@app.get("/api/auth/me")
def get_current_admin_info(admin: AdminUser = Depends(get_current_admin)):
    return {"username": admin.username, "authenticated": True}


@app.put("/auth/password")
@app.put("/api/auth/password")
def change_admin_password(
    data: PasswordChange,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    admin.password_hash = hash_password(data.new_password)
    db.commit()
    return {"status": "success", "message": "Password updated successfully"}


# -----------------------------
# Admin Protected Endpoints
# -----------------------------

@app.put("/admin/profile", response_model=ProfileOut)
@app.put("/api/admin/profile", response_model=ProfileOut)
def update_profile(
    data: ProfileUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).first()
    if not profile:
        profile = Profile(**data.model_dump())
        db.add(profile)
    else:
        for key, value in data.model_dump().items():
            setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


# Experiences
@app.post("/admin/experiences", response_model=ExperienceOut)
@app.post("/api/admin/experiences", response_model=ExperienceOut)
def create_experience(
    data: ExperienceCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    exp = Experience(**data.model_dump())
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


@app.put("/admin/experiences/{exp_id}", response_model=ExperienceOut)
@app.put("/api/admin/experiences/{exp_id}", response_model=ExperienceOut)
def update_experience(
    exp_id: int,
    data: ExperienceUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    exp = db.query(Experience).filter(Experience.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    for key, value in data.model_dump().items():
        setattr(exp, key, value)
    db.commit()
    db.refresh(exp)
    return exp


@app.delete("/admin/experiences/{exp_id}")
@app.delete("/api/admin/experiences/{exp_id}")
def delete_experience(
    exp_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    exp = db.query(Experience).filter(Experience.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    db.delete(exp)
    db.commit()
    return {"status": "success", "message": "Experience deleted"}


# Projects
@app.post("/admin/projects", response_model=ProjectOut)
@app.post("/api/admin/projects", response_model=ProjectOut)
def create_project(
    data: ProjectCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    proj = Project(**data.model_dump())
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj


@app.put("/admin/projects/{proj_id}", response_model=ProjectOut)
@app.put("/api/admin/projects/{proj_id}", response_model=ProjectOut)
def update_project(
    proj_id: int,
    data: ProjectUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    proj = db.query(Project).filter(Project.id == proj_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in data.model_dump().items():
        setattr(proj, key, value)
    db.commit()
    db.refresh(proj)
    return proj


@app.delete("/admin/projects/{proj_id}")
@app.delete("/api/admin/projects/{proj_id}")
def delete_project(
    proj_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    proj = db.query(Project).filter(Project.id == proj_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(proj)
    db.commit()
    return {"status": "success", "message": "Project deleted"}


# Skills
@app.post("/admin/skills", response_model=SkillOut)
@app.post("/api/admin/skills", response_model=SkillOut)
def create_skill(
    data: SkillCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    skill = Skill(**data.model_dump())
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@app.put("/admin/skills/{skill_id}", response_model=SkillOut)
@app.put("/api/admin/skills/{skill_id}", response_model=SkillOut)
def update_skill(
    skill_id: int,
    data: SkillUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    for key, value in data.model_dump().items():
        setattr(skill, key, value)
    db.commit()
    db.refresh(skill)
    return skill


@app.delete("/admin/skills/{skill_id}")
@app.delete("/api/admin/skills/{skill_id}")
def delete_skill(
    skill_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    db.delete(skill)
    db.commit()
    return {"status": "success", "message": "Skill deleted"}


# Education
@app.put("/admin/education/{edu_id}", response_model=EducationOut)
@app.put("/api/admin/education/{edu_id}", response_model=EducationOut)
def update_education(
    edu_id: int,
    data: EducationUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    edu = db.query(Education).filter(Education.id == edu_id).first()
    if not edu:
        raise HTTPException(status_code=404, detail="Education record not found")
    for key, value in data.model_dump().items():
        setattr(edu, key, value)
    db.commit()
    db.refresh(edu)
    return edu


# Awards
@app.post("/admin/awards", response_model=AwardOut)
@app.post("/api/admin/awards", response_model=AwardOut)
def create_award(
    data: AwardCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    award = Award(**data.model_dump())
    db.add(award)
    db.commit()
    db.refresh(award)
    return award


@app.put("/admin/awards/{award_id}", response_model=AwardOut)
@app.put("/api/admin/awards/{award_id}", response_model=AwardOut)
def update_award(
    award_id: int,
    data: AwardUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    award = db.query(Award).filter(Award.id == award_id).first()
    if not award:
        raise HTTPException(status_code=404, detail="Award not found")
    for key, value in data.model_dump().items():
        setattr(award, key, value)
    db.commit()
    db.refresh(award)
    return award


@app.delete("/admin/awards/{award_id}")
@app.delete("/api/admin/awards/{award_id}")
def delete_award(
    award_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    award = db.query(Award).filter(Award.id == award_id).first()
    if not award:
        raise HTTPException(status_code=404, detail="Award not found")
    db.delete(award)
    db.commit()
    return {"status": "success", "message": "Award deleted"}


# Certifications
@app.post("/admin/certifications", response_model=CertificationOut)
@app.post("/api/admin/certifications", response_model=CertificationOut)
def create_certification(
    data: CertificationCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    cert = Certification(**data.model_dump())
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


@app.put("/admin/certifications/{cert_id}", response_model=CertificationOut)
@app.put("/api/admin/certifications/{cert_id}", response_model=CertificationOut)
def update_certification(
    cert_id: int,
    data: CertificationUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    cert = db.query(Certification).filter(Certification.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    for key, value in data.model_dump().items():
        setattr(cert, key, value)
    db.commit()
    db.refresh(cert)
    return cert


@app.delete("/admin/certifications/{cert_id}")
@app.delete("/api/admin/certifications/{cert_id}")
def delete_certification(
    cert_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    cert = db.query(Certification).filter(Certification.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    db.delete(cert)
    db.commit()
    return {"status": "success", "message": "Certification deleted"}


# Contact Messages
@app.get("/admin/messages", response_model=List[ContactMessageOut])
@app.get("/api/admin/messages", response_model=List[ContactMessageOut])
def get_contact_messages(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()


@app.put("/admin/messages/{msg_id}/read")
@app.put("/api/admin/messages/{msg_id}/read")
def mark_message_read(
    msg_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    msg = db.query(ContactMessage).filter(ContactMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_read = True
    db.commit()
    return {"status": "success", "message": "Marked as read"}


@app.delete("/admin/messages/{msg_id}")
@app.delete("/api/admin/messages/{msg_id}")
def delete_contact_message(
    msg_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    msg = db.query(ContactMessage).filter(ContactMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    db.delete(msg)
    db.commit()
    return {"status": "success", "message": "Message deleted"}


# Reset to Resume Defaults
@app.post("/admin/reset-defaults")
@app.post("/api/admin/reset-defaults")
def reset_to_defaults(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    seed_database(db, force=True)
    return {"status": "success", "message": "Database successfully reset to resume defaults"}


# -----------------------------
# Blog Endpoints
# -----------------------------

@app.get("/posts", response_model=List[BlogPostOut])
@app.get("/api/posts", response_model=List[BlogPostOut])
def get_published_posts(db: Session = Depends(get_db)):
    return db.query(BlogPost).filter(BlogPost.is_published == True).order_by(BlogPost.created_at.desc()).all()


@app.get("/posts/{slug}", response_model=BlogPostOut)
@app.get("/api/posts/{slug}", response_model=BlogPostOut)
def get_post_by_slug(slug: str, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.slug == slug, BlogPost.is_published == True).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return post


@app.get("/admin/posts", response_model=List[BlogPostOut])
@app.get("/api/admin/posts", response_model=List[BlogPostOut])
def get_all_posts_admin(admin: AdminUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(BlogPost).order_by(BlogPost.created_at.desc()).all()


@app.post("/admin/posts", response_model=BlogPostOut)
@app.post("/api/admin/posts", response_model=BlogPostOut)
def create_blog_post(
    data: BlogPostCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    # Check slug uniqueness
    existing = db.query(BlogPost).filter(BlogPost.slug == data.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="A post with this URL slug already exists")
    post = BlogPost(**data.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@app.put("/admin/posts/{post_id}", response_model=BlogPostOut)
@app.put("/api/admin/posts/{post_id}", response_model=BlogPostOut)
def update_blog_post(
    post_id: int,
    data: BlogPostUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    update_dict = data.model_dump(exclude_unset=True)
    if "slug" in update_dict and update_dict["slug"] != post.slug:
        existing = db.query(BlogPost).filter(BlogPost.slug == update_dict["slug"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already in use by another post")
            
    for k, v in update_dict.items():
        setattr(post, k, v)
    db.commit()
    db.refresh(post)
    return post


@app.delete("/admin/posts/{post_id}")
@app.delete("/api/admin/posts/{post_id}")
def delete_blog_post(
    post_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    db.delete(post)
    db.commit()
    return {"status": "success", "message": "Blog post deleted"}


# -----------------------------
# Resume JSON Import Endpoint
# -----------------------------

@app.post("/admin/import-resume")
@app.post("/api/admin/import-resume")
async def import_resume_json(
    payload: dict,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Imports and maps reactive resume / JSON export data directly into models.
    Wipes existing resume records, populates cleanly, and generates AI insights via Gemini.
    """
    populate_from_resume_payload(db, payload)
    invalidate_agent_prompt_cache()

    profile = db.query(Profile).first()
    insights = await generate_and_save_ai_insights(db, profile)

    return {
        "status": "success",
        "message": f"Resume JSON successfully imported and {len(insights)} AI insights generated!",
        "ai_insights_generated": len(insights),
    }


@app.post("/admin/generate-ai-insights")
@app.post("/api/admin/generate-ai-insights")
async def trigger_generate_ai_insights(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found. Please upload or seed data first.")
    insights = await generate_and_save_ai_insights(db, profile)
    return {
        "status": "success",
        "message": f"Successfully generated {len(insights)} AI insights using Gemini!",
        "count": len(insights),
    }


# -----------------------------
# Dynamic AI Agent System Prompt
# -----------------------------

def build_dynamic_agent_prompt(db: Session, custom_data: Optional[dict] = None, mode: str = "general") -> str:
    if custom_data and isinstance(custom_data, dict) and custom_data.get("profile"):
        prof = custom_data.get("profile", {})
        name = prof.get("name") or "the developer"
        title = prof.get("title") or "Full Stack Developer & Data Engineer"
        summary = prof.get("summary") or ""
        location = prof.get("location") or ""
        email = prof.get("email") or ""
        phone = prof.get("phone") or ""
        linkedin = prof.get("linkedin_url") or ""
        github = prof.get("github_url") or ""

        exps = custom_data.get("experiences", [])
        exp_bullets = []
        for e in exps:
            r = e.get("role", "")
            c = e.get("company", "")
            s = e.get("start_date", "")
            end = e.get("end_date") or "Present"
            desc = e.get("description", "")
            sk = e.get("skills_text", "")
            b = f"- {r} at {c} ({s} – {end}): {desc}"
            if sk:
                b += f" [Skills: {sk}]"
            exp_bullets.append(b)

        skills = custom_data.get("skills", [])
        skill_names = ", ".join([s.get("name", "") for s in skills[:25] if s.get("name")])

        projects = custom_data.get("projects", [])
        proj_bullets = []
        for p in projects[:5]:
            p_title = p.get("title", "")
            p_tech = p.get("tech_stack", "")
            p_desc = p.get("description", "")
            proj_bullets.append(f"- {p_title} ({p_tech}): {p_desc}")

        insights = custom_data.get("ai_insights", [])
        insight_bullets = []
        for i in insights:
            t = i.get("title") or ""
            sub = i.get("subtitle") or ""
            insight_bullets.append(f"- {t} ({sub})")

        awards = custom_data.get("awards", [])
        award_names = ", ".join([a.get("title", "") for a in awards if a.get("title")])
        certs = custom_data.get("certifications", [])
        cert_names = ", ".join([c.get("name", "") for c in certs if c.get("name")])
    else:
        profile = db.query(Profile).first()
        name = profile.name if profile and profile.name else "the developer"
        title = profile.title if profile and profile.title else "Full Stack Developer & Data Engineer"
        summary = profile.summary if profile and profile.summary else ""
        location = profile.location if profile and profile.location else ""
        email = profile.email if profile and profile.email else ""
        phone = profile.phone if profile and profile.phone else ""
        linkedin = profile.linkedin_url if profile and profile.linkedin_url else ""
        github = profile.github_url if profile and profile.github_url else ""

        exps = db.query(Experience).order_by(Experience.display_order.asc()).all()
        exp_bullets = []
        for e in exps:
            bullet = f"- {e.role} at {e.company} ({e.start_date} – {e.end_date or 'Present'}): {e.description or ''}"
            if e.skills_text:
                bullet += f" [Skills: {e.skills_text}]"
            exp_bullets.append(bullet)

        skills = db.query(Skill).order_by(Skill.display_order.asc()).all()
        skill_names = ", ".join([s.name for s in skills[:25]])

        projects = db.query(Project).order_by(Project.display_order.asc()).all()
        proj_bullets = [f"- {p.title} ({p.tech_stack}): {p.description}" for p in projects[:5]]

        insights = db.query(AiInsight).order_by(AiInsight.display_order.asc()).all()
        insight_bullets = [f"- {i.title}: {i.subtitle}" for i in insights]

        awards = db.query(Award).all()
        award_names = ", ".join([a.title for a in awards])

        certs = db.query(Certification).all()
        cert_names = ", ".join([c.name for c in certs])

    mode_guidance = ""
    if mode == "technical":
        mode_guidance = f"MODE: TECHNICAL DEEP-DIVE. Provide in-depth technical explanations with code patterns, API latency considerations, database query tuning, and distributed concurrency."
    elif mode == "challenge":
        mode_guidance = f"MODE: SYSTEM DESIGN CHALLENGE. The user is asking how {name} would solve or architect a system design challenge. Structure your response as a Principal Architect: 1. Core Architecture Blueprint, 2. Tech Stack Choices ({skill_names[:60]}), 3. Scalability & Latency Strategy, 4. Edge Cases & Resiliency."
    elif mode == "recruiter":
        mode_guidance = f"MODE: EXPERIENCE & CAREER FIT. Highlight {name}'s career trajectory, tangible business impacts, engineering leadership, and role availability."
    elif mode == "tldr":
        mode_guidance = f"MODE: 60-SECOND TL;DR. Deliver an ultra-punchy 3-bullet summary of {name}'s superpowers and accomplishments."
    else:
        mode_guidance = "MODE: INTERACTIVE ASSISTANT. Speak authoritatively, articulately, and concisely about the developer's background."

    prompt = f"""You are the advanced holographic AI interface and technical co-pilot representing {name} ({title}) on this engineering portfolio website.
Your demeanor is sophisticated, articulate, razor-sharp, calm, and polite.
You speak with authoritative technical precision about {name}'s system designs, projects, codebases, and achievements in the third person ("{name} architected...", "According to system telemetry, {name} optimized..."). Address visitors courteously and intelligently ("Certainly", "Accessing schematics...", "Allow me to present {name}'s architectural milestones..."). Do NOT refer to yourself as J.A.R.V.I.S.

{mode_guidance}

Candidate Profile:
- Name: {name}
- Headline / Role: {title}
- Location: {location}
- Contact Email: {email}
- Contact Phone: {phone}
- LinkedIn: {linkedin}
- GitHub: {github}
- Bio Summary: {summary}

Engineering Experience:
{chr(10).join(exp_bullets) if exp_bullets else '- Experienced software and data engineer.'}

Key Projects:
{chr(10).join(proj_bullets) if proj_bullets else '- Distributed Streaming & Microservices Platform'}

Technical Skills:
{skill_names if skill_names else 'Full Stack, Cloud, Data Engineering'}

Architectural Philosophy & Milestones:
{chr(10).join(insight_bullets) if insight_bullets else '- Low-latency distributed pipelines and resilient microservices.'}

Certifications & Awards:
- Certifications: {cert_names if cert_names else 'None listed'}
- Awards: {award_names if award_names else 'None listed'}

Interactive Navigation Guidelines:
- Keep replies concise, articulate, and technical (2-4 sentences or clean bullet points).
- When relevant to what you are describing, you can append one of the following exact navigation tags at the very end of your reply to let the visitor jump directly to that section on the live page:
  [NAV:projects] -> when recommending they look at projects
  [NAV:experience] -> when recommending work history
  [NAV:skills] -> when recommending skills matrix
  [NAV:ai-insights] -> when recommending engineering philosophy
  [NAV:contact] -> when encouraging them to reach out or leave a message
  [NAV:blog] -> when mentioning technical blog articles
The website UI will automatically convert these tags into interactive 1-click jump buttons.
"""
    return prompt.strip()


# -----------------------------
# AI Agent Endpoint (Optimized for Sub-Second Latency)
# -----------------------------

import os
import time
import httpx
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    portfolio_data: Optional[Dict[str, Any]] = None
    mode: Optional[str] = "general"

# In-memory prompt cache to eliminate redundant DB queries on every turn
_cached_prompt: Optional[str] = None
_cached_prompt_time: float = 0.0

def invalidate_agent_prompt_cache():
    global _cached_prompt, _cached_prompt_time
    _cached_prompt = None
    _cached_prompt_time = 0.0

def get_or_build_agent_prompt(db: Session, custom_data: Optional[Dict[str, Any]] = None, mode: str = "general") -> str:
    global _cached_prompt, _cached_prompt_time
    if custom_data and isinstance(custom_data, dict) and custom_data.get("profile"):
        return build_dynamic_agent_prompt(db, custom_data=custom_data, mode=mode)
    
    if mode != "general":
        return build_dynamic_agent_prompt(db, custom_data=None, mode=mode)

    now = time.time()
    if _cached_prompt and (now - _cached_prompt_time < 300):
        return _cached_prompt
    
    _cached_prompt = build_dynamic_agent_prompt(db, custom_data=None, mode="general")
    _cached_prompt_time = now
    return _cached_prompt


# Persistent client to reuse TLS connection across serverless warm invocations
_gemini_client: Optional[httpx.AsyncClient] = None

def get_gemini_client() -> httpx.AsyncClient:
    global _gemini_client
    if _gemini_client is None or _gemini_client.is_closed:
        _gemini_client = httpx.AsyncClient(
            timeout=10.0,
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
        )
    return _gemini_client


# Preferred ultra-fast production models in priority order.
# Verified: gemini-3.5-flash-lite returns sub-second responses (~0.5s) without thinking overhead.
PREFERRED_FAST_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-flash-latest",
]

def generate_fallback_ai_insights(name: str, title: str, summary: Optional[str], experiences: list, skills: list, projects: list) -> dict:
    top_exps = experiences[:3]
    top_companies = [e.company for e in top_exps if e.company]
    top_skills = [s.name for s in skills[:8]]
    company_str = ", ".join(top_companies) if top_companies else "leading engineering teams"
    skill_str = ", ".join(top_skills[:5]) if top_skills else "Python, Cloud, & Distributed Microservices"

    return {
        "engineering_philosophy": {
            "title": "Engineering Philosophy & Focus",
            "subtitle": "Architectural Principles & Software Craftsmanship",
            "content": f"I focus on designing software systems that balance high throughput with resilient, maintainable architecture. Having built production platforms across {company_str}, I prioritize clean service boundaries, end-to-end data integrity, and deterministic latency over premature complexity. My goal is always to deliver performant systems that scale gracefully under real-world demand.",
            "principles": [
                "Pragmatic Architecture: Prioritizing clean service boundaries, observability, and simplicity over resume-driven complexity.",
                f"Latency & Performance Obsession: Profiling queries, caching critical paths, and tuning async event loops with {skill_str}.",
                "End-to-End Ownership: Deep commitment from distributed cloud infrastructure and CI/CD automation to polished client experiences.",
            ],
        },
        "architecture_highlights": {
            "title": "System Architecture & Production Milestones",
            "subtitle": "Scalability, Distributed Pipelines & Low-Latency Performance",
            "bullets": [
                f"Architected high-throughput microservices and distributed data pipelines leveraging {skill_str}.",
                "Engineered resilient ETL ingestion workflows handling high-volume analytical records with sub-second performance.",
                "Championed cloud modernization, automated CI/CD deployment pipelines, and containerization best practices.",
            ],
        },
        "domain_expertise": {
            "title": "Domain Expertise & What I Build",
            "subtitle": "Core Specializations & Technical Vision",
            "mission": f"Passionate about solving complex engineering bottlenecks, designing distributed data pipelines, and building scalable cloud-native architectures with {skill_str}.",
            "focus_areas": [
                "High-Throughput Data Ingestion",
                "Resilient Cloud Backends & Microservices",
                "API Performance & Query Tuning",
                "Modern Reactive Interfaces & Dashboards",
            ],
            "technical_stack": top_skills[:6] if top_skills else ["Python", "FastAPI", "PostgreSQL", "Docker", "Cloud", "React"],
            "values": [
                "Sub-second API Latency",
                "Zero-Downtime Releases",
                "Strict Type Safety & Clean Contracts",
                "Data Integrity & Fault Tolerance",
            ],
        },
    }


async def generate_and_save_ai_insights(db: Session, profile: Profile) -> list:
    raw_key = os.getenv("GEMINI_API_KEY", "")
    api_key = raw_key.strip().strip('"').strip("'").strip()

    experiences = db.query(Experience).order_by(Experience.display_order.asc()).all()
    skills = db.query(Skill).order_by(Skill.category.asc()).all()
    projects = db.query(Project).all()

    name = profile.name if profile and profile.name else "The Developer"
    title = profile.title if profile and profile.title else "Software Engineer"
    summary = profile.summary if profile else ""

    exp_summary = "; ".join([f"{e.role} at {e.company} ({e.skills_text or ''})" for e in experiences[:4]])
    skill_summary = ", ".join([s.name for s in skills[:25]])
    proj_summary = "; ".join([f"{p.title}: {p.description[:80]}" for p in projects[:3]])

    prompt = f"""You are an elite software architect and technical biographer.
Analyze this software engineer's background and generate 3 structured sections for their personal developer portfolio website.
The tone must be authentic, authoritative, personal, and focused on software craftsmanship, architectural philosophy, and engineering achievements (NOT a third-party recruiter or HR evaluation report).

Engineer Profile:
- Name: {name}
- Title / Headline: {title}
- Background Summary: {summary}
- Experience: {exp_summary}
- Core Skills: {skill_summary}
- Projects: {proj_summary}

Return ONLY valid JSON matching this exact structure:
{{
  "engineering_philosophy": {{
    "title": "Engineering Philosophy & Focus",
    "subtitle": "Architectural Principles & Software Craftsmanship",
    "content": "A thoughtful 3-4 sentence narrative written for their personal developer website describing how they approach systems design, scale, code reliability, maintainability, and clean architecture.",
    "principles": [
      "Pragmatic architectural principle with technical depth",
      "Performance and latency optimization principle",
      "System resiliency or end-to-end engineering ownership principle"
    ]
  }},
  "architecture_highlights": {{
    "title": "System Architecture & Production Milestones",
    "subtitle": "Scalability, Distributed Pipelines & Low-Latency Performance",
    "bullets": [
      "Key technical triumph in distributed backends, data pipelines, or cloud systems",
      "Production metric achievement in API latency reduction, throughput, or query tuning",
      "Modernization, containerization, or automated deployment rigor"
    ]
  }},
  "domain_expertise": {{
    "title": "Domain Expertise & What I Build",
    "subtitle": "Core Specializations & Technical Vision",
    "mission": "A compelling 1-2 sentence statement summarizing what technical challenges excite them most and the kind of high-impact systems they love designing.",
    "focus_areas": ["Key engineering discipline 1", "Key engineering discipline 2", "Key engineering discipline 3", "Key engineering discipline 4"],
    "technical_stack": ["Primary framework or language 1", "Database or pipeline tool 2", "Cloud or infra tool 3", "Architecture pattern 4"],
    "values": ["Sub-second API Latency", "Zero-Downtime Releases", "Strict Type Safety", "Data Integrity & Fault Tolerance"]
  }}
}}"""

    insights_data = None
    if api_key:
        client = get_gemini_client()
        headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 800,
                "responseMimeType": "application/json",
            },
        }
        for model in PREFERRED_FAST_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        raw_json = candidates[0]["content"]["parts"][0]["text"]
                        cleaned = raw_json.strip()
                        if cleaned.startswith("```"):
                            cleaned = cleaned.split("```")[1]
                            if cleaned.startswith("json"):
                                cleaned = cleaned[4:]
                        insights_data = json.loads(cleaned.strip())
                        break
            except Exception as e:
                print(f"AI insights generation attempt with {model} failed: {e}")
                continue

    if not insights_data:
        insights_data = generate_fallback_ai_insights(name, title, summary, experiences, skills, projects)

    db.query(AiInsight).delete()
    db.flush()

    created_insights = []
    # 1. Philosophy
    phil_data = insights_data.get("engineering_philosophy") or insights_data.get("executive_summary") or {}
    created_insights.append(
        AiInsight(
            section_key="engineering_philosophy",
            title=phil_data.get("title", "Engineering Philosophy & Focus"),
            subtitle=phil_data.get("subtitle", "Architectural Principles & Software Craftsmanship"),
            content=json.dumps(phil_data),
            display_order=1,
        )
    )

    # 2. Architecture
    arch_data = insights_data.get("architecture_highlights") or {}
    created_insights.append(
        AiInsight(
            section_key="architecture_highlights",
            title=arch_data.get("title", "System Architecture & Production Milestones"),
            subtitle=arch_data.get("subtitle", "Scalability, Distributed Pipelines & Low-Latency Performance"),
            content=json.dumps(arch_data),
            display_order=2,
        )
    )

    # 3. Domain Expertise
    domain_data = insights_data.get("domain_expertise") or insights_data.get("recruiter_fit") or {}
    created_insights.append(
        AiInsight(
            section_key="domain_expertise",
            title=domain_data.get("title", "Domain Expertise & What I Build"),
            subtitle=domain_data.get("subtitle", "Core Specializations & Technical Vision"),
            content=json.dumps(domain_data),
            display_order=3,
        )
    )

    for item in created_insights:
        db.add(item)
    db.commit()
    for item in created_insights:
        db.refresh(item)

    return created_insights



@app.post("/chat")
@app.post("/api/chat")
async def chat_with_harsha_agent(req: ChatRequest, db: Session = Depends(get_db)):
    t_start = time.time()
    raw_key = os.getenv("GEMINI_API_KEY", "")
    api_key = raw_key.strip().strip('"').strip("'").strip()
    # Resolve first name dynamically
    cand_name = ""
    if req.portfolio_data and isinstance(req.portfolio_data, dict):
        cand_name = req.portfolio_data.get("profile", {}).get("name", "")
    if not cand_name:
        prof = db.query(Profile).first()
        cand_name = prof.name if prof else "Developer"
    
    parts = cand_name.split()
    first_name = parts[-1] if len(parts) >= 3 else (parts[0] if parts else "Developer")

    if not api_key:
        return {
            "reply": f"Hello! I am {first_name}'s AI Agent. To activate live responses, add the GEMINI_API_KEY environment variable in your Vercel Project Settings."
        }

    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json"
    }

    system_prompt = get_or_build_agent_prompt(db, custom_data=req.portfolio_data, mode=req.mode or "general")

    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [
            {"role": "user", "parts": [{"text": req.message}]}
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 350,
        }
    }

    client = get_gemini_client()
    last_error = ""

    # Strategy 1: Try ultra-fast production models directly (no ListModels overhead)
    for model_name in PREFERRED_FAST_MODELS:
        gen_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        try:
            gen_resp = await client.post(gen_url, json=payload, headers=headers)
            if gen_resp.status_code == 200:
                data = gen_resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    text = candidates[0]["content"]["parts"][0]["text"]
                    elapsed = round(time.time() - t_start, 2)
                    return {"reply": text, "model": model_name, "latency_s": elapsed, "mode": req.mode or "general"}
                return {"reply": "Received empty response from Gemini."}

            try:
                err_msg = gen_resp.json().get("error", {}).get("message", gen_resp.text)
            except Exception:
                err_msg = gen_resp.text
            last_error = f"{model_name}: {err_msg}"
        except Exception as e:
            last_error = f"{model_name}: {str(e)}"
            continue

    # Strategy 2: If none of the preferred models worked, fallback to ListModels
    try:
        list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        list_resp = await client.get(list_url, headers=headers)
        if list_resp.status_code == 200:
            models_data = list_resp.json().get("models", [])
            valid_models = [
                m["name"] for m in models_data 
                if "generateContent" in m.get("supportedGenerationMethods", [])
                and "thinking" not in m.get("name", "").lower()
                and not m.get("name", "").startswith("models/gemma")
                and not any(tag in m.get("name", "").lower() for tag in ["tts", "image", "transcribe", "robotics", "clip", "audio", "banana"])
            ]
            def _sort_key(m_name: str) -> int:
                nl = m_name.lower()
                if "flash-lite" in nl:
                    return 0
                if "flash" in nl:
                    return 1
                return 2

            valid_models.sort(key=_sort_key)
            for model_path in valid_models:
                clean_path = model_path if model_path.startswith("models/") else f"models/{model_path}"
                gen_url = f"https://generativelanguage.googleapis.com/v1beta/{clean_path}:generateContent?key={api_key}"
                try:
                    gen_resp = await client.post(gen_url, json=payload, headers=headers)
                    if gen_resp.status_code == 200:
                        data = gen_resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            text = candidates[0]["content"]["parts"][0]["text"]
                            elapsed = round(time.time() - t_start, 2)
                            return {"reply": text, "model": clean_path, "latency_s": elapsed}
                except Exception:
                    continue
    except Exception as e:
        last_error = str(e)

    return {"reply": f"Could not generate reply ({last_error})."}
