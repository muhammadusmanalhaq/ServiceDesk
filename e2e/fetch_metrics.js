async function run() {
  try {
    const loginRes = await fetch("http://localhost:5093/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@test.com", password: "Password123!" })
    });
    const { accessToken } = await loginRes.json();
    console.log("Token acquired");
    
    const metricsRes = await fetch("http://localhost:5093/api/metrics/dashboard", {
      headers: { "Authorization": "Bearer " + accessToken }
    });
    console.log("Status:", metricsRes.status);
    const txt = await metricsRes.text();
    console.log("Body:", txt);
  } catch (err) {
    console.error(err);
  }
}
run();
