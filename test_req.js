const test = async () => {
  const res = await fetch("https://app-tattoo.onrender.com/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studioName: "Tattoo Studio Test",
      userName: "Admin Test",
      email: "",
      password: "admin123"
    })
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
};
test();
