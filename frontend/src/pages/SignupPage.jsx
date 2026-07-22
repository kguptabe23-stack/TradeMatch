import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import BrandMark from "../components/BrandMark";
import { FormField, inputClassName } from "../components/FormField";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signup(name, email, password);
      // Brand new account: never has a listing yet, so always land on the
      // gate form — no need to check.
      navigate("/listings/new?gate=1");
    } catch (err) {
      const field =
        err.status === 409 ? "email" : err.message.toLowerCase().includes("password") ? "password" : "form";
      setErrors({ [field]: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-7 py-9 max-w-sm mx-auto">
      <div className="flex justify-center mb-1.5">
        <BrandMark size={32} />
      </div>
      <div className="text-center mt-1.5">
        <div className="font-poppins font-bold text-[22px] text-[#121212]">Create your account</div>
        <div className="text-[13px] text-[#777] mt-1.5">
          Trade what you have for what you want — no money involved.
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px] mt-[18px]">
        <FormField label="Name" error={errors.name}>
          <input
            className={inputClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <input
            className={inputClassName}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </FormField>
        <FormField label="Password" error={errors.password}>
          <input
            className={inputClassName}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8+ characters"
          />
        </FormField>
        {errors.form && <p className="text-xs text-[#DD3333]">{errors.form}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-12 rounded-full bg-brand-coral text-white font-bold text-sm mt-1.5 disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
        <div className="text-center text-[13px] text-[#777]">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-teal font-medium">
            Log in
          </Link>
        </div>
      </form>
    </div>
  );
}
