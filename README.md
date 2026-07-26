# ServiceDesk 🎫

An enterprise-grade, multi-tenant ticketing and IT service management platform built with **ASP.NET Core 8**, **React (Vite)**, and **PostgreSQL**. Engineered with a zero-trust architecture, database-level tenant isolation via Row-Level Security (RLS), OpenTelemetry observability, and automated CI/CD pipelines on Azure.

---

## 🏗 System Architecture

```mermaid
graph LR
    User[User / Client] -->|HTTPS| UI[React Frontend]
    UI -->|REST API| API[ASP.NET Core 8 API]
    API -->|EF Core + RLS| DB[(PostgreSQL)]

    subgraph Azure Cloud Environment
        subgraph Azure Container Apps
            API
        end
        subgraph Security & Monitoring
            KV[Azure Key Vault] -.->|Secrets| API
            AppIns[Application Insights] <.-|OpenTelemetry| API
        end
    end

    subgraph Background Processing
        API -.->|Hangfire| Jobs[SLA & Audit Jobs]
        Jobs -.->|Postgres| DB
    end
🌟 Key Engineering FeaturesMulti-Tenant RLS Isolation: Enforces department-level data security natively inside PostgreSQL using Row-Level Security policies instead of application code checks.Zero-Trust Infrastructure: Container Apps authenticate with Azure Key Vault using User-Assigned Managed Identities via OIDC.Automated CD Pipeline: Staged GitHub Actions deployment featuring automated unit/integration tests with Testcontainers, staging deployment, smoke testing, and manual approval gates for production.OpenTelemetry Observability: Zero-friction distributed tracing, HTTP metrics, and Entity Framework query performance streaming directly to Azure Application Insights.🚀 Live DemoStaging API (Swagger UI): Explore Staging API🛠 Tech StackLayerTechnologyFrontendReact 18, Vite, TailwindCSSBackend.NET 8 (ASP.NET Core Web API), HangfireDatabasePostgreSQL (Neon Cloud) with Entity Framework CoreInfrastructureBicep (IaC), Azure Container Apps, Key Vault, Application InsightsCI/CD & TestingGitHub Actions (OIDC), xUnit, Testcontainers💻 Local Development Setup1. Prerequisites.NET 8 SDKNode.js v18+Docker Desktop (Required for running integration tests via Testcontainers)2. Clone RepositoryBashgit clone https://github.com/muhammadusmanalhaq/ServiceDesk.git
cd ServiceDesk
3. Configure Development SecretsSet up local secrets for the backend API without committing credentials:Bashcd src/ServiceDesk.Api

dotnet user-secrets set "ConnectionStrings:Default" "Host=YOUR_HOST;Database=neondb;Username=neondb_owner;Password=YOUR_PASSWORD;SslMode=Require;Trust Server Certificate=true"
dotnet user-secrets set "ConnectionStrings:System" "Host=YOUR_HOST;Database=neondb;Username=neondb_owner;Password=YOUR_PASSWORD;SslMode=Require;Trust Server Certificate=true"
dotnet user-secrets set "Jwt:Key" "YourSuperSecretDevelopmentKeyThatIsAtLeast32BytesLong!"
4. Run the Backend APIBashdotnet run
The API will boot and automatically apply EF Core database migrations on startup.5. Run the React FrontendIn a new terminal window:Bashcd src/servicedesk-web
npm install
npm run dev
🧪 Running TestsExecute the test suite (Unit tests + Integration tests using isolated Docker containers):Bashdotnet test

---

### Once saved in VS Code, run these simple git commands:

```bash
git add README.md
git commit -m "docs: Update README with architecture and setup guide"
git push
