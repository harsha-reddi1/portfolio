import base64
import json
import os
import re
from typing import List

from sqlalchemy.orm import Session
from .auth import hash_password

POST1_CONTENT = """# Never Let the LLM Do the Math: A Practical Guide to Grounded Generation

*Patterns for building trustworthy LLM features on top of real data*

## Introduction
LLMs write fluent text, but fluency is not accuracy. In a data product, a single invented number in an AI-generated summary can undermine user trust. This post covers practical patterns for keeping LLM output grounded in real data.

## Principle: the model explains, the server computes
Treat the LLM as a writer, not a calculator.
- Compute all metrics in your backend or data layer.
- Pass the results to the model as structured input.
- Instruct the model to use only the supplied values.

```json
{
  "metric": "weekly_spend",
  "current": 1240.50,
  "previous": 1105.20,
  "change_pct": 12.2
}
```

## Validate the output
A prompt is a request, not a guarantee. Enforce the rule in code:
1. Extract every number from the generated text.
2. Check that each one maps to a value you supplied (allowing for rounding and formatting).
3. If any figure is unmatched, reject the output and retry, with a capped retry count.

```python
def is_grounded(text: str, allowed: set[float]) -> bool:
    found = extract_numbers(text)
    return all(any(matches(n, a) for a in allowed) for n in found)
```

## Cache by input hash
Generation is deterministic with respect to its inputs only if you make it so. Hash the structured input (plus the prompt version and model name) and use it as the cache key.
- Same input means same cached output.
- Each unique input costs one model call.
- Include the prompt version in the key so prompt changes invalidate stale entries.

## Test with an LLM as judge
Prompts and agents change often, and manual review does not scale. Build a regression harness:
- Keep a fixed set of representative inputs.
- Have a judge model score outputs on criteria such as accuracy, relevance and tone.
- Track latency alongside quality.
- Accept a change only if scores hold or improve.

Calibrate the judge against human-labeled examples first, and use a different model family for judging when possible to reduce self-preference bias.

## Route models by task
Not every call needs your strongest model.
- **Fast, cheap models** for high-volume work such as classification, extraction and short summaries.
- **Stronger models** for multi-step reasoning and tool-heavy agents.
- A gateway such as LiteLLM gives you one interface and makes routing a config change.

Also trim what you send. Strip unused fields from API responses before they reach the model, since fewer tokens means lower cost and less distraction.

## Reduce agent latency
- **Prompt caching** for long, stable system prompts and tool definitions.
- **Parallel tool calls** when the calls are independent.
- **Token caps** so one runaway response doesn't stall the request.

## Guardrails for generated content
If your system publishes LLM-written text or AI images automatically, add a gate:
- Screen images with a vision model before publishing.
- **Fail closed:** if the check fails or errors, publish nothing.
- Run generation in a queued background job so slow model calls never block your main application.

## Checklist
1. Compute numbers server-side, never in the model.
2. Validate every figure in the output.
3. Cache on a hash of input, prompt version and model.
4. Gate changes with an automated judge.
5. Route by task and trim your inputs.
6. When a safety check errors, fail closed.

*How do you keep your LLM outputs grounded? Share your approach in the comments.*"""

POST2_CONTENT = """# Fast, Safe, Reliable APIs: Postgres, Sketches, Streaming and Security

*Backend patterns for analytics-style APIs on FastAPI, PostgreSQL and BigQuery*

## Introduction
Analytics APIs face a familiar mix of problems: slow queries, expensive distinct counts, heavy payloads and strict data-privacy needs. Here are five patterns that address them.

## 1. Let the query plan choose your indexes
Don't guess. Read the plan.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM transactions
WHERE merchant_id = 42 AND txn_date >= '2026-01-01';
```

What to look for:
- Sequential scans on large tables.
- Large gaps between estimated and actual row counts.
- Expensive sorts that an index could satisfy.

Tips:
- Match composite index column order to your filters and sort.
- Use partial indexes when queries target a known subset.
- Build indexes with `CREATE INDEX CONCURRENTLY` to avoid locking writes.
- Use a shared connection pool (for example PgBouncer or your driver's pool) instead of opening a connection per request.

## 2. Count distinct users with HyperLogLog
Exact distinct counts across overlapping groups are expensive. A shopper who visits several stores must be counted once in an area total, and you can't just add per-store counts.

**HyperLogLog (HLL)** is a probabilistic sketch that estimates distinct counts in small, fixed memory, with a small, predictable error.
- Sketches can be **merged**, so you can combine per-store sketches into an area-level count without double counting.
- Precompute sketches per location, then union them at query time for radius, trade-area or zip-code queries.
- The trade-off is approximate answers, which is usually fine for analytics but not for billing.

## 3. Shrink payloads
- Enable gzip (or brotli) compression for large JSON responses.
- Return only the fields clients need.
- Paginate large result sets.

## 4. Design analytics APIs with honesty built in
- **Driver breakdowns** explain why a metric moved, not just that it moved.
- **Confidence handling:** suppress or flag results from samples too small to be reliable.
- **Privacy thresholds:** enforce a minimum group size so small cohorts can't identify individuals.
- **Log hygiene:** keep personal data out of logs.

## 5. Authorization: explicit beats implicit
A common failure is a wildcard or overly broad grant that accidentally passes admin checks.
- Define a dedicated permission per endpoint.
- Deny by default.
- Enforce coverage with automated tests that fail when a route has no explicit permission.

```python
@router.get("/reports", dependencies=[Depends(require("reports:read"))])
async def get_reports(): ...
```

## 6. Reliability patterns
- **Exactly-once notifications:** use idempotency keys or an outbox pattern so retries don't duplicate messages.
- **Safe upserts:** use `INSERT ... ON CONFLICT` with a proper unique constraint so concurrent writers don't collide.
- **Streaming uploads:** process files in chunks instead of loading them fully into memory.

```python
async def save_upload(file: UploadFile, dest):
    while chunk := await file.read(1024 * 1024):
        dest.write(chunk)
```

- **Migration checks in CI:** detect multiple migration heads or conflicting changes before merge, not at deploy time.

## Checklist
1. Read query plans before adding indexes.
2. Use mergeable sketches for distinct counts.
3. Compress and trim responses.
4. Build privacy and confidence rules into the API.
5. Give every endpoint its own tested permission.
6. Make writes idempotent and uploads streaming.
7. Catch migration conflicts in CI.

*What backend bottleneck surprised you most? Tell me in the comments.*"""

from .models import (
    AdminUser,
    Award,
    BlogPost,
    Certification,
    Education,
    Experience,
    Profile,
    Project,
    Skill,
    AiInsight,
)


def clean_html_tags(text: str) -> str:
    if not text:
        return ""
    clean = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    clean = re.sub(r"<[^>]+>", " ", clean)
    return " ".join(clean.split())


def extract_bullets_from_html(html_text: str) -> List[str]:
    if not html_text:
        return []
    items = re.findall(r"<li>(?:<p>)?(.*?)(?:</p>)?</li>", html_text, re.DOTALL | re.IGNORECASE)
    if not items:
        items = re.findall(r"<li>(.*?)</li>", html_text, re.DOTALL | re.IGNORECASE)
    bullets = [clean_html_tags(i) for i in items if clean_html_tags(i)]
    return bullets


def populate_from_resume_payload(db: Session, payload: dict) -> None:
    """
    Parses Reactive Resume, standard JSON Resume, or full Portfolio export payload and updates database tables.
    """
    # 1. Update / create Profile
    profile = db.query(Profile).first()
    if not profile:
        profile = Profile(name="Portfolio Owner", title="Engineer", email="user@example.com")
        db.add(profile)
        db.flush()

    # Clear previous social URLs so old URLs don't bleed into the new profile
    profile.github_url = ""
    profile.linkedin_url = ""
    profile.hackerrank_url = ""
    profile.x_url = ""
    profile.leetcode_url = ""
    profile.website_url = ""

    prof_data = payload.get("profile")
    if prof_data and isinstance(prof_data, dict):
        profile.name = prof_data.get("name") or profile.name
        profile.title = prof_data.get("title") or profile.title
        profile.email = prof_data.get("email") or profile.email
        profile.phone = prof_data.get("phone") or ""
        profile.location = prof_data.get("location") or ""
        profile.summary = prof_data.get("summary") or ""
        profile.github_url = prof_data.get("github_url") or ""
        profile.linkedin_url = prof_data.get("linkedin_url") or ""
        profile.hackerrank_url = prof_data.get("hackerrank_url") or ""
        profile.x_url = prof_data.get("x_url") or ""
        profile.leetcode_url = prof_data.get("leetcode_url") or ""
        profile.website_url = prof_data.get("website_url") or ""
        profile.resume_download_url = prof_data.get("resume_download_url") or "#"

    basics = payload.get("basics") or (payload.get("profile") if isinstance(payload.get("profile"), dict) else {}) or {}
    summary_data = payload.get("summary", {})
    summary_content = clean_html_tags(summary_data.get("content", "")) if isinstance(summary_data, dict) else (basics.get("summary") or "")

    if basics.get("name"):
        profile.name = basics.get("name")
    if basics.get("headline") or basics.get("title") or basics.get("label"):
        profile.title = basics.get("headline") or basics.get("title") or basics.get("label")
    if basics.get("email"):
        profile.email = basics.get("email")
    if basics.get("phone"):
        profile.phone = basics.get("phone")
    if basics.get("location"):
        loc = basics.get("location")
        profile.location = f"{loc.get('city', '')}, {loc.get('region', '')}" if isinstance(loc, dict) else str(loc)
    if summary_content:
        profile.summary = summary_content

    # Check direct basics URLs
    if basics.get("github_url") or basics.get("github"):
        profile.github_url = basics.get("github_url") or basics.get("github")
    if basics.get("linkedin_url") or basics.get("linkedin"):
        profile.linkedin_url = basics.get("linkedin_url") or basics.get("linkedin")
    if basics.get("url") or basics.get("website"):
        w = basics.get("url") or basics.get("website")
        if isinstance(w, str):
            profile.website_url = w
            if "github.com" in w and not profile.github_url:
                profile.github_url = w
            elif "linkedin.com" in w and not profile.linkedin_url:
                profile.linkedin_url = w

    sections = payload.get("sections", {})

    # Profiles / Social links list from sections, basics, or root
    profiles_list = (
        sections.get("profiles", {}).get("items", []) or
        basics.get("profiles", []) or
        payload.get("profiles", [])
    )
    for p in profiles_list:
        net = (p.get("network") or p.get("name") or "").lower()
        url = (
            (p.get("website", {}) or {}).get("url") or
            p.get("url") or
            (p.get("website") if isinstance(p.get("website"), str) else "") or
            ""
        ).strip()
        if not url:
            continue
        if "linkedin" in net and not profile.linkedin_url:
            profile.linkedin_url = url
        elif "github" in net and not profile.github_url:
            profile.github_url = url
        elif "hackerrank" in net and not profile.hackerrank_url:
            profile.hackerrank_url = url
        elif ("x" in net or "twitter" in net) and not profile.x_url:
            profile.x_url = url
        elif "leetcode" in net and not profile.leetcode_url:
            profile.leetcode_url = url

    # Clear previous relational records
    db.query(Experience).delete()
    db.query(Education).delete()
    db.query(Skill).delete()
    db.query(Project).delete()
    db.query(Award).delete()
    db.query(Certification).delete()
    db.flush()

    # 2. Experiences
    exp_items = sections.get("experience", {}).get("items", []) or payload.get("work", []) or payload.get("experiences", [])
    for idx, e in enumerate(exp_items):
        raw_desc = e.get("description") or e.get("summary") or ""
        skills_match = re.search(r"Skill\(s\)\s*[-:]\s*(?:</strong>)?(.*?)(?:</strong>)?\s*</p>", raw_desc, re.IGNORECASE | re.DOTALL)
        if not skills_match:
            skills_match = re.search(r"Skill\(s\)\s*[-:]\s*(.*?)(?:</p>|<ul>|<li>|$)", raw_desc, re.IGNORECASE)
        skills_text = clean_html_tags(skills_match.group(1)).rstrip(".") if skills_match else ""
        if not skills_text and isinstance(e.get("skills"), list):
            skills_text = ", ".join(e.get("skills"))

        bullets = extract_bullets_from_html(raw_desc)
        if not bullets and isinstance(e.get("highlights"), list):
            bullets = [clean_html_tags(h) for h in e.get("highlights") if h]

        desc_without_skills = re.sub(r"<p>\s*(?:<strong>)?\s*Skill\(s\).*?<\/p>", "", raw_desc, flags=re.IGNORECASE | re.DOTALL)
        desc_without_bullets = re.sub(r"<ul[^>]*>.*?<\/ul>", "", desc_without_skills, flags=re.IGNORECASE | re.DOTALL)
        clean_desc = clean_html_tags(desc_without_bullets).strip()

        period = e.get("period", "")
        period_parts = [p.strip() for p in re.split(r"\s*(?:[–—\-]|to)\s*", period) if p.strip()] if period else []
        is_current = bool((e.get("dates", {}) or {}).get("present", False) or e.get("is_current") or "present" in str(period).lower())

        if len(period_parts) >= 2:
            start_date = period_parts[0]
            end_date = "Present" if is_current else period_parts[1]
        elif len(period_parts) == 1:
            start_date = period_parts[0]
            end_date = "Present" if is_current else ""
        else:
            dates = e.get("dates", {}) or {}
            start_date = e.get("start_date") or e.get("startDate") or dates.get("start") or ""
            end_date = "Present" if is_current else (e.get("end_date") or e.get("endDate") or dates.get("end") or "")

        company = e.get("company") or e.get("name") or "Company"
        role = e.get("position") or e.get("role") or "Software Engineer"

        if not clean_desc and not bullets:
            clean_desc = f"Software Engineer at {company}, driving software architecture and delivery."
            bullets = [clean_desc]

        exp = Experience(
            company=company,
            role=role,
            location=e.get("location", "") if isinstance(e.get("location"), str) else "",
            start_date=start_date,
            end_date=end_date,
            is_current=is_current,
            skills_text=skills_text,
            description=clean_desc,
            achievements=json.dumps(bullets) if bullets else json.dumps([clean_desc]),
            display_order=idx + 1,
        )
        db.add(exp)

    # 3. Education
    edu_items = sections.get("education", {}).get("items", []) or payload.get("education", [])
    for idx, ed in enumerate(edu_items):
        dates = ed.get("dates", {}) or {}
        ed_period = ed.get("period", "")
        ed_parts = [p.strip() for p in re.split(r"\s*(?:[–—\-]|to)\s*", ed_period) if p.strip()] if ed_period else []
        start_year = ed_parts[0] if len(ed_parts) >= 1 else (ed.get("start_year") or dates.get("start") or "")
        end_year = ed_parts[1] if len(ed_parts) >= 2 else (ed.get("end_year") or dates.get("end") or "")

        db.add(
            Education(
                institution=ed.get("school") or ed.get("institution") or "Institution",
                degree=ed.get("degree") or "Degree",
                field_of_study=ed.get("area") or ed.get("field_of_study") or "Engineering",
                grade=ed.get("grade") or "",
                start_year=start_year,
                end_year=end_year,
                url=(ed.get("website", {}) or {}).get("url") or ed.get("url") or "",
            )
        )

    # 4. Skills
    skill_items = sections.get("skills", {}).get("items", []) or payload.get("skills", [])
    for idx, s in enumerate(skill_items):
        name = (s if isinstance(s, str) else s.get("name", "")).strip()
        if not name:
            continue
        n_low = name.lower()
        if any(x in n_low for x in ["azure", "synapse", "pyspark", "databricks", "cloud", "aws", "gcp"]):
            category = "Cloud & Big Data"
        elif any(x in n_low for x in ["python", "django", "java", "spring", "fastapi", "flask", "node"]):
            category = "Languages & Backend"
        elif any(x in n_low for x in ["react", "angular", "javascript", "typescript", "html", "css"]):
            category = "Frontend"
        elif any(x in n_low for x in ["sql", "mysql", "postgres", "mongo", "database"]):
            category = "Databases"
        elif any(x in n_low for x in ["docker", "kubernetes", "git", "devops", "jenkins", "pipeline"]):
            category = "DevOps & Cloud"
        else:
            category = "Core Competencies"

        db.add(
            Skill(
                name=name,
                category=category,
                proficiency="Expert" if idx < 8 else "Proficient",
                display_order=idx + 1,
            )
        )

    # 5. Projects
    proj_items = sections.get("projects", {}).get("items", []) or payload.get("projects", [])
    for idx, pr in enumerate(proj_items):
        p_name = pr.get("name") or pr.get("title") or f"Project {idx + 1}"
        p_desc = clean_html_tags(pr.get("description", "")) or f"{p_name} architecture and deployment."
        p_url = (
            pr.get("github_url") or
            (pr.get("website", {}) or {}).get("url") or
            pr.get("url") or
            (pr.get("website") if isinstance(pr.get("website"), str) else "") or
            ""
        )
        live_url = pr.get("live_url") or pr.get("website_url") or ""
        if p_url and not p_url.startswith("http"):
            p_url = f"https://{p_url}"
        db.add(
            Project(
                title=p_name,
                subtitle=pr.get("subtitle") or "Engineered Solution",
                description=p_desc,
                tech_stack=pr.get("tech_stack") or "Python, Cloud Services, REST APIs",
                github_url=p_url,
                live_url=live_url,
                highlights=json.dumps([p_desc]),
                featured=True,
                display_order=idx + 1,
            )
        )

    # 6. Awards
    award_items = sections.get("awards", {}).get("items", []) or payload.get("awards", [])
    for idx, aw in enumerate(award_items):
        a_title = aw.get("title") or "Recognition"
        db.add(
            Award(
                title=a_title,
                organization=aw.get("awarder") or aw.get("organization") or "Corporate Honor",
                year=aw.get("date") or (aw.get("dates", {}) or {}).get("start") or aw.get("year") or "",
                description=clean_html_tags(aw.get("description", "")),
                display_order=idx + 1,
            )
        )

    # 7. Certifications
    cert_items = sections.get("certifications", {}).get("items", []) or payload.get("certifications", []) or payload.get("certificates", [])
    for idx, ct in enumerate(cert_items):
        c_title = ct.get("title") or ct.get("name") or "Certification"
        db.add(
            Certification(
                name=c_title,
                issuer=ct.get("issuer") or "Accredited Provider",
                issue_date=ct.get("date") or ct.get("issue_date") or "",
                credential_url=(ct.get("website", {}) or {}).get("url") or ct.get("url") or "",
                display_order=idx + 1,
            )
        )

    db.commit()


def seed_database(db: Session, force: bool = False):
    # Ensure Admin User exists
    admin = db.query(AdminUser).filter(AdminUser.username == "admin").first()
    default_pass = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
    if not admin:
        admin = AdminUser(
            username="admin",
            password_hash=hash_password(default_pass),
        )
        db.add(admin)
        db.commit()
    elif force:
        admin.password_hash = hash_password(default_pass)

    existing_profile = db.query(Profile).first()
    is_placeholder = existing_profile is None or existing_profile.email == "developer@example.com"

    # Check if user provided private portfolio JSON in Vercel environment variables
    env_json_raw = os.getenv("PORTFOLIO_DATA_JSON") or os.getenv("RESUME_DATA_JSON")
    if env_json_raw and (force or is_placeholder):
        try:
            raw = env_json_raw.strip()
            if raw.startswith("{"):
                payload = json.loads(raw)
            else:
                decoded = base64.b64decode(raw).decode("utf-8")
                payload = json.loads(decoded)

            populate_from_resume_payload(db, payload)
            print("Successfully populated database from PORTFOLIO_DATA_JSON environment variable!")
            return
        except Exception as e:
            print("Failed to auto-seed from PORTFOLIO_DATA_JSON:", e)

    if not force and not is_placeholder:
        return  # Already seeded or has custom data

    if force:
        db.query(Profile).delete()
        db.query(Experience).delete()
        db.query(Project).delete()
        db.query(Skill).delete()
        db.query(Education).delete()
        db.query(Award).delete()
        db.query(Certification).delete()
        db.commit()

    # Generic Placeholder Profile (Upload your real resume via Admin > Import Resume JSON)
    profile = Profile(
        name="Developer Portfolio",
        title="Data Engineer & Full Stack Developer",
        email="developer@example.com",
        phone="+1 555-0100",
        location="Global / Remote",
        summary=(
            "Software engineer with extensive experience in architecting scalable applications, "
            "data systems, cloud microservices, and modern web platforms. Proven background in "
            "performance tuning and engineering leadership."
        ),
        years_experience=5,
        linkedin_url="https://linkedin.com",
        github_url="https://github.com/harsha-reddi1",
        hackerrank_url="https://hackerrank.com",
        x_url="https://x.com",
        leetcode_url="https://leetcode.com",
        website_url="",
        resume_download_url="#",
    )
    db.add(profile)

    # Generic Starter Experiences
    experiences = [
        Experience(
            company="Enterprise Cloud Solutions",
            role="Senior Software Engineer",
            location="Remote",
            start_date="2023",
            end_date="Present",
            is_current=True,
            skills_text="Python, FastAPI, Distributed Systems, Cloud Architecture",
            description="Architecting high-throughput microservices and distributed data pipelines.",
            achievements=json.dumps([
                "Modernized enterprise cloud architectures achieving 40% latency reduction.",
                "Designed resilient REST and streaming APIs for mission-critical client workloads.",
                "Mentored engineering teams on CI/CD pipelines, container orchestration, and automated testing."
            ]),
            display_order=1,
        ),
        Experience(
            company="Data Tech Innovations",
            role="Data & Backend Engineer",
            location="Remote",
            start_date="2020",
            end_date="2023",
            is_current=False,
            skills_text="Python, SQL, ETL Pipelines, React JS",
            description="Developed analytical data engines and scalable user interfaces.",
            achievements=json.dumps([
                "Built automated ETL data ingestion pipelines processing millions of daily records.",
                "Developed interactive web dashboards using React JS and FastAPI backend services.",
                "Optimized relational database queries to eliminate bottlenecks during peak traffic."
            ]),
            display_order=2,
        ),
    ]
    db.add_all(experiences)

    # Generic Starter Skills
    skills = [
        Skill(name="Python", category="Languages & Backend", proficiency="Expert", display_order=1),
        Skill(name="FastAPI", category="Languages & Backend", proficiency="Expert", display_order=2),
        Skill(name="Django REST", category="Languages & Backend", proficiency="Advanced", display_order=3),
        Skill(name="SQL & PostgreSQL", category="Databases", proficiency="Expert", display_order=4),
        Skill(name="React JS", category="Frontend", proficiency="Advanced", display_order=5),
        Skill(name="Docker & Containers", category="DevOps & Cloud", proficiency="Advanced", display_order=6),
        Skill(name="Cloud Services (Azure/AWS)", category="DevOps & Cloud", proficiency="Advanced", display_order=7),
    ]
    db.add_all(skills)

    # Generic Starter Projects
    projects = [
        Project(
            title="Real-Time Data Streaming Engine",
            subtitle="High-Throughput Analytics Service",
            description="Distributed ingestion pipeline supporting real-time event aggregation and analytical processing.",
            tech_stack="Python, FastAPI, Redis, Docker",
            github_url="https://github.com/harsha-reddi1",
            live_url="",
            highlights=json.dumps([
                "Sub-50ms ingestion latency for distributed telemetry.",
                "Configurable event schemas and automated health monitoring."
            ]),
            featured=True,
            display_order=1,
        ),
        Project(
            title="Full-Stack Management Platform",
            subtitle="Secure Multi-Tenant Dashboard",
            description="Comprehensive administrative platform featuring role-based access control, analytics charts, and dynamic workflows.",
            tech_stack="React JS, Tailwind CSS, FastAPI, SQLite",
            github_url="https://github.com/harsha-reddi1",
            live_url="",
            highlights=json.dumps([
                "JWT authentication and automated audit logging.",
                "Responsive dashboard UI with interactive data tables."
            ]),
            featured=True,
            display_order=2,
        ),
    ]
    db.add_all(projects)

    # Generic Education
    db.add(
        Education(
            institution="University of Technology",
            degree="Bachelor of Science",
            field_of_study="Computer Science",
            grade="First Class with Distinction",
            start_year="2016",
            end_year="2020",
            url="https://example.com",
        )
    )

    # Generic Certifications & Awards
    db.add(
        Certification(
            name="Cloud Solutions Architect",
            issuer="Cloud Platform",
            issue_date="2023",
            credential_url="",
            display_order=1,
        )
    )

    db.add(
        Award(
            title="Engineering Excellence Award",
            organization="Tech Organization",
            year="2023",
            description="Recognized for exceptional technical leadership and system optimization.",
            display_order=1,
        )
    )

    # Ensure technical blog posts exist
    for p_info in [
        {
            "title": "Never Let the LLM Do the Math: A Practical Guide to Grounded Generation",
            "slug": "never-let-the-llm-do-the-math",
            "excerpt": "Patterns for building trustworthy LLM features on top of real data",
            "content": POST1_CONTENT,
            "tags": "GenAI, LLM, RAG, MCP, Prompt Caching, LiteLLM, AI Engineering",
            "cover_image": "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80",
        },
        {
            "title": "Fast, Safe, Reliable APIs: Postgres, Sketches, Streaming and Security",
            "slug": "fast-safe-reliable-apis-postgres-sketches-streaming-and-security",
            "excerpt": "Backend patterns for analytics-style APIs on FastAPI, PostgreSQL and BigQuery",
            "content": POST2_CONTENT,
            "tags": "PostgreSQL, FastAPI, BigQuery, HyperLogLog, API Security, Backend Engineering, Performance",
            "cover_image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
        },
    ]:
        if not db.query(BlogPost).filter(BlogPost.slug == p_info["slug"]).first():
            db.add(BlogPost(**p_info, is_published=True))
            db.commit()

    if not db.query(AiInsight).first():
        db.add_all([
            AiInsight(
                section_key="engineering_philosophy",
                title="Engineering Philosophy & Focus",
                subtitle="Architectural Principles & Software Craftsmanship",
                content=json.dumps({
                    "title": "Engineering Philosophy & Focus",
                    "subtitle": "Architectural Principles & Software Craftsmanship",
                    "content": "I believe in building software that balances high throughput with resilient, maintainable architecture. Rather than introducing premature complexity, I focus on clean service boundaries, end-to-end data integrity, and deterministic latency. Whether modernizing distributed data pipelines or engineering responsive microservices, my focus is on delivering reliable production systems that scale gracefully under real-world demand.",
                    "principles": [
                        "Pragmatic Architecture: Prioritizing clean boundaries, observability, and simplicity over resume-driven complexity.",
                        "Latency & Performance Obsession: Profiling queries, caching critical paths, and tuning async event loops for sub-second responses.",
                        "End-to-End Ownership: Deep commitment from distributed cloud infrastructure and CI/CD automation to polished client experiences."
                    ]
                }),
                display_order=1
            ),
            AiInsight(
                section_key="architecture_highlights",
                title="System Architecture & Production Milestones",
                subtitle="Scalability, Distributed Pipelines & Low-Latency Performance",
                content=json.dumps({
                    "title": "System Architecture & Production Milestones",
                    "subtitle": "Scalability, Distributed Pipelines & Low-Latency Performance",
                    "bullets": [
                        "Architected distributed microservices and asynchronous backend workflows leveraging Python and FastAPI, significantly cutting API response latency.",
                        "Engineered resilient ETL ingestion pipelines handling high-volume analytical records with robust error handling and schema validation.",
                        "Championed cloud modernization, automated CI/CD deployment pipelines, containerization, and zero-downtime deployments."
                    ]
                }),
                display_order=2
            ),
            AiInsight(
                section_key="domain_expertise",
                title="Domain Expertise & What I Build",
                subtitle="Core Specializations & Technical Vision",
                content=json.dumps({
                    "title": "Domain Expertise & What I Build",
                    "subtitle": "Core Specializations & Technical Vision",
                    "mission": "Passionate about solving complex engineering bottlenecks, designing distributed data pipelines, and building scalable cloud-native architectures that deliver high performance and exceptional reliability.",
                    "focus_areas": [
                        "High-Throughput Data Ingestion",
                        "Resilient Cloud Backends & Microservices",
                        "API Performance & Query Tuning",
                        "Modern Reactive Interfaces & Dashboards"
                    ],
                    "technical_stack": [
                        "Python / FastAPI / REST",
                        "Cloud & Container Orchestration",
                        "SQL & Database Query Tuning",
                        "Distributed Event Processing",
                        "React JS & Modern Web"
                    ],
                    "values": [
                        "Sub-second API Latency",
                        "Zero-Downtime Releases",
                        "Strict Type Safety & Clean Contracts",
                        "Data Integrity & Fault Tolerance"
                    ]
                }),
                display_order=3
            )
        ])

    db.commit()
