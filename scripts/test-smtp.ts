import { sendMail, verifySmtp } from "../src/lib/mail";

async function main() {
  console.log("Verifying SMTP…");
  const v = await verifySmtp();
  console.log(v);
  if (!v.ok) process.exit(1);

  console.log("Sending test email to tarsnetworks@gmail.com…");
  const r = await sendMail({
    to: "tarsnetworks@gmail.com",
    subject: "Y-Flow SMTP test — Y Not Manufacturing",
    text: "SMTP is configured correctly for Y-Flow.\n\nFrom: Y Not Manufacturing",
  });
  console.log(r);
  if (!r.ok) process.exit(1);
}

main();
