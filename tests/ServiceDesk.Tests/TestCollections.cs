using Xunit;

namespace ServiceDesk.Tests;

/// <summary>
/// Marks both integration test classes as members of the same xUnit collection.
/// This prevents xUnit from running them in parallel AND ensures they share a single
/// CustomWebApplicationFactory instance (via ICollectionFixture), avoiding the
/// ObjectDisposedException that occurs when the factory is torn down by the first
/// class while the second is still initialising.
/// </summary>
[CollectionDefinition("Integration")]
public class IntegrationTestCollection : ICollectionFixture<CustomWebApplicationFactory> { }
