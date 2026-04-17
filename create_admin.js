const create = async () => {
  const res = await fetch("https://app-tattoo.onrender.com/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studioName: "Meu Estúdio",
      userName: "Admin",
      email: "contato2@inkmasters.com",
      password: "admin123"
    })
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
};
create();
