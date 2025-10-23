const http = require("http");

async function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function testDashboard() {
  try {
    console.log("Testing dashboard data flow...\n");

    // Step 1: Login
    console.log("1. Logging in as arthur@example.com...");
    const loginRes = await makeRequest({
      hostname: "localhost",
      port: 3003,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    }, JSON.stringify({
      email: "arthur@example.com",
      password: "Wxcvbn123"
    }));

    const loginData = JSON.parse(loginRes.body);
    console.log("   Login response:", loginData);

    if (!loginData.success || !loginData.token) {
      console.error("   Login failed");
      return;
    }

    console.log("   Login successful\n");

    // Step 2: Access dashboard
    console.log("2. Accessing gestionnaire dashboard...");
    const dashRes = await makeRequest({
      hostname: "localhost",
      port: 3003,
      path: "/gestionnaire/dashboard",
      method: "GET",
      headers: {
        "Cookie": "auth-token=" + loginData.token
      }
    });

    console.log("   Dashboard response status:", dashRes.status);

    // Step 3: Parse dashboard HTML to find stats
    const html = dashRes.body;

    // Look for the stats values in the HTML
    const buildingMatch = html.match(/Immeubles[\s\S]*?<div[^>]*class="[^"]*text-2xl[^"]*"[^>]*>(\d+)<\/div>/);
    const lotsMatch = html.match(/Lots[\s\S]*?<div[^>]*class="[^"]*text-2xl[^"]*"[^>]*>(\d+)<\/div>/);
    const occupiedMatch = html.match(/Occupés[\s\S]*?<div[^>]*class="[^"]*text-2xl[^"]*"[^>]*>(\d+)\/(\d+)<\/div>/);
    const contactsMatch = html.match(/Contacts[\s\S]*?<div[^>]*class="[^"]*text-2xl[^"]*"[^>]*>(\d+)<\/div>/);

    console.log("\n3. Dashboard Stats Found in HTML:");
    console.log("   Buildings:", buildingMatch ? buildingMatch[1] : "NOT FOUND");
    console.log("   Lots:", lotsMatch ? lotsMatch[1] : "NOT FOUND");
    console.log("   Occupied:", occupiedMatch ? occupiedMatch[1] + "/" + occupiedMatch[2] : "NOT FOUND");
    console.log("   Contacts:", contactsMatch ? contactsMatch[1] : "NOT FOUND");

  } catch (error) {
    console.error("Test failed:", error);
  }
}

testDashboard();
