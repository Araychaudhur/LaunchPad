// Minimal shim so TS accepts `import nodemailer from "nodemailer"`
// We don't need rich types here; `any` is fine for our usage.
declare module "nodemailer" {
  const nodemailer: any;
  export default nodemailer;
}