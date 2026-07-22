import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { hasActiveListing } from "../auth/postAuthRedirect";
import BrandMark from "../components/BrandMark";
import { FormField, inputClassName } from "../components/FormField";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const errs = {};
    if (!email.trim()) errs.email = "Email is required";
    if (!password) errs.password = "Password is required";
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
      await login(email, password);
      navigate((await hasActiveListing()) ? "/feed" : "/listings/new?gate=1");
    } catch (err) {
      setErrors({ form: err.message });
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
        <div className="font-poppins font-bold text-[22px] text-[#121212]">Welcome back</div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px] mt-[18px]">
        {errors.form && (
          <div className="bg-[#FDECEA] text-[#C0392B] text-sm px-3.5 py-2.5 rounded-[10px]">
            {errors.form}
          </div>
        )}
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
            placeholder="Password"
          />
        </FormField>
        <button
          type="submit"
          disabled={loading}
          className="h-12 rounded-full bg-brand-coral text-white font-bold text-sm mt-1.5 disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
        <div className="text-center text-[13px] text-[#777]">
          New here?{" "}
          <Link to="/signup" className="text-brand-teal font-medium">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
}
