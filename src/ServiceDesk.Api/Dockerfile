FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["ServiceDesk.Api.csproj", "./"]
RUN dotnet restore "ServiceDesk.Api.csproj"
COPY . .
RUN dotnet publish "ServiceDesk.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "ServiceDesk.Api.dll"]
