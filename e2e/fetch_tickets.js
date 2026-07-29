async function run() {
  const loginRes = await fetch("http://localhost:5093/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alice@test.com", password: "Password123!" })
  });
  const { accessToken } = await loginRes.json();
  const res = await fetch("http://localhost:5093/api/tickets", {
    headers: { "Authorization": "Bearer " + accessToken }
  });
  const data = await res.json();
  console.log(JSON.stringify(data[0], null, 2));
}
run();
