# Stage 1: Build and Publish
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files first to leverage Docker layer caching
COPY *.sln .
COPY src/ServiceDesk.Api/*.csproj src/ServiceDesk.Api/
COPY tests/ServiceDesk.Tests/*.csproj tests/ServiceDesk.Tests/
RUN dotnet restore

# Copy the rest of the source code
COPY . .

# Publish the API project
WORKDIR /src/src/ServiceDesk.Api
RUN dotnet publish -c Release -o /app/publish

# Stage 2: Final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy the published output from the build stage
COPY --from=build /app/publish .

# Create a non-root user for security (Running as root in containers is a major security risk)
RUN useradd -m appuser
USER appuser

# Expose port 8080 (ASP.NET Core 8 default for non-root users)
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080

ENTRYPOINT ["dotnet", "ServiceDesk.Api.dll"]
