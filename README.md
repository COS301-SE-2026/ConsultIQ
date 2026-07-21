# ConsultIQ

## Project Description
ConsultIQ is a consultant placement platform for consultancy firms. It matches 
consultants to projects using a configurable fit-score engine — weighing skills, 
availability, location, and cost then surfaces a ranked shortlist with a 
transparent breakdown of each candidate's score.




---
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)

![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)

[![Coverage Status](https://coveralls.io/repos/github/COS301-SE-2026/ConsultIQ/badge.svg?branch=main)](https://coveralls.io/github/COS301-SE-2026/ConsultIQ)

[![codecov](https://codecov.io/gh/COS301-SE-2026/ConsultIQ/graph/badge.svg?token=X7XEPWW7PQ)](https://codecov.io/gh/COS301-SE-2026/ConsultIQ)

[![GitHub Issues](https://img.shields.io/github/issues/COS301-SE-2026/ConsultIQ)](https://github.com/COS301-SE-2026/ConsultIQ/issues)

[![Last Commit](https://img.shields.io/github/last-commit/COS301-SE-2026/ConsultIQ?display_timestamp=committer)](https://github.com/COS301-SE-2026/ConsultIQ/commits/main)



---
## Documentation

* [Functional Requirements (SRS)](...)
* [TROOS Project Board](...)

---


## Meet the Team

| Name | Role's | Links |
|------|----------------|-------|
| **Ofentse Modika** | Team Lead, Backend Engineer, DevOps Engineer | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/Ofentse360) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ofentse-modika-b09126248) |
| **Siyabonga Sibiya** | Business Analyst, Database Engineer, Backend Engineer| [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/SiyaSibiya) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](http://www.linkedin.com/in/siyabonga-sibiya-086543237) |
| **Onthatile Molebaloa** | Database Engineer, Frontend Engineer | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/Onthatile-22659812) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/onthatile-molebaloa-93a4642a8/) |
| **Tshireletso Sebake** | Frontend Engineer, DevOps Engineer | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/Ramatsobane29) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tshireletso-sebake-9b3397253/) |
| **Retshepile Nkwana** | Backend Engineer, DevOps Engineer, Data Analyst | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/RNkwana) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/retshepile-nkwana-817297292/) |


## Tech Stack

| Category | Technologies & Tools |
| :--- | :--- |
| **Frontend & Web Dashboard** | React, TypeScript, Vercel (Hosting) |
| **Backend API** | NestJS (Node.js) |
| **Database & Caching** | PostgreSQL, Redis |
| **AI & Automation** | LangChain, Vercel AI SDK |
| **Infrastructure & Hosting** | AWS (Backend Hosting)|
| **CI/CD** | GitHub Actions |
| **Testing** | Jest, Supertest, React Testing Library |


## Live System

| Environment | URL |
|---|---|
| Production (Frontend) | https://consult-iq-red.vercel.app |
| Production (Backend API) | http://13.247.189.149:3000 |
| Staging (Backend API) | http://13.247.189.149:3001 |

## Rollback Strategy

ConsultIQ uses image tag pinning for rollback. Every deployment produces two Docker image tags:
- `latest` / `staging` — the current deployed version
- `{commit-sha}` — a permanent reference to that exact build

**To roll back a failed production deployment:**

1. Find the last working commit SHA in the [GitHub Actions history](https://github.com/COS301-SE-2026/ConsultIQ/actions)
2. SSH into EC2:
```bash
   ssh -i consultiq-key.pem ubuntu@13.247.189.149
```
3. Edit the production compose file to pin to the previous SHA:
```bash
   nano /home/ubuntu/ConsultIQ/docker-compose.prod.yml
```
   Change:
```yaml
   image: ghcr.io/cos301-se-2026/consultiq-backend:latest
```
   To:
```yaml
   image: ghcr.io/cos301-se-2026/consultiq-backend:{previous-sha}
```
4. Redeploy:
```bash
   docker-compose -f docker-compose.prod.yml up -d
```

**To roll back staging**, follow the same steps using `docker-compose.staging.yml`.

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for required environment variables.

## Local Development with Docker

```bash
docker-compose up
```

This starts PostgreSQL, Redis, backend, and frontend together.
