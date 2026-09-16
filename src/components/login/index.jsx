import React, { useEffect, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";
import styles from "./login.module.css";
import { supabase } from "@/utils/supabaseClient";
import Cookies from "js-cookie";
import { useForm } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ButtonLoader from "../ButtonLoader.jsx";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

const LoginComponent = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const [isLoading, setIsLoading] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const getToast = Cookies.get("signout_toast");
    if (getToast === "true") {
      toast.success(`Successfully Logged Out`, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      setTimeout(() => {
        Cookies.remove("signout_toast");
      }, 500);
    }
  }, []);

  const onSubmit = async (formData) => {
    if (isResetPassword) {
      try {
        setIsLoading(true);
        const redirectUrl = `${window.location.origin}/hrms/reset-password`;
        const { data: resetData, error } =
          await supabase.auth.resetPasswordForEmail(formData.email, {
            redirectTo: redirectUrl,
          });
        if (resetData) {
          setIsLoading(false);
          toast.success(
            "Successfully sent reset password link to your provided email",
            {
              position: "bottom-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "colored",
            }
          );
        }
        if (error) {
          setIsLoading(false);
          toast.error(error?.message, {
            position: "bottom-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
          });
        }
      } catch (error) {
        setIsLoading(false);
      }
    } else {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) {
          setIsLoading(false);
          toast.error(error?.message, {
            position: "bottom-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
          });
        } else {
          const session = data.session;
          const accessTokenExpiry = new Date(session.expires_at * 1000);
          const cookieOpts = { expires: accessTokenExpiry, sameSite: "lax" };
          Cookies.set("user_id", session.user.id, cookieOpts);
          Cookies.set("signin_toast", "true");
          Cookies.set("access_token", session.access_token, cookieOpts);
          Cookies.set("refresh_token", session.refresh_token, cookieOpts);
          setIsLoading(false);
          window.location.href = "/hrms/dashboard";
        }
      } catch (error) {
        setIsLoading(false);
        console.log(error);
      }
    }
  };

  return (
    <div className={`${styles.page} ${plusJakartaSans.className}`}>
      <ToastContainer />

      <div className={styles.background} aria-hidden="true">
        <Image
          src="/assets/images/screen.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.backgroundImage}
        />
        <div className={styles.backgroundOverlay} />
      </div>
      {/* <div className={styles.frameBorder} aria-hidden="true" /> */}

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.logoLink} href="#">
            <Image
              src="/assets/images/logo-white.svg"
              alt="Cynosoft"
              width={177}
              height={44}
              priority
              className={styles.logoImage}
            />
          </a>

          <div className={styles.headerActions}>
            <span className={styles.needAssistance}>Need assistance?</span>
            <a className={styles.helpLink} href="#help">
              <svg
                className={styles.helpIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              IT Helpdesk
            </a>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.authSection}>
          <div className={styles.authCardWrap}>
            <div className={styles.authCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  {isResetPassword ? "Reset Password" : "Welcome Back"}
                </h2>
                <p className={styles.cardSubtitle}>
                  {isResetPassword
                    ? "Enter your email to receive a password reset link"
                    : "Please enter your credentials to access your portal"}
                </p>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className={styles.form}
                noValidate
              >
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="email">
                    Work Email Address
                  </label>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputIcon}>
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </div>
                    <input
                      id="email"
                      type="email"
                      placeholder="name@cynosoft.com"
                      className={styles.input}
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value:
                            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                          message: "Invalid email address",
                        },
                      })}
                    />
                  </div>
                  {errors?.email && (
                    <p className={styles.fieldError}>{errors.email.message}</p>
                  )}
                </div>

                {!isResetPassword && (
                  <div className={styles.fieldGroup}>
                    <div className={styles.fieldLabelRow}>
                      <label className={styles.fieldLabel} htmlFor="password">
                        Password
                      </label>
                    </div>
                    <div className={styles.inputWrapper}>
                      <div className={styles.inputIcon}>
                        <svg
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={`${styles.input} ${styles.inputPassword}`}
                        {...register("password", {
                          required: "Password is required",
                          minLength: {
                            value: 6,
                            message: "Password must be at least 6 characters",
                          },
                        })}
                      />
                      <button
                        type="button"
                        aria-label="Toggle password visibility"
                        className={`${styles.togglePassword} ${
                          showPassword ? styles.togglePasswordActive : ""
                        }`}
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        <svg
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          {showPassword ? (
                            <>
                              <path
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.8"
                              />
                            </>
                          ) : (
                            <>
                              <path
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.8"
                              />
                              <path
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.8"
                              />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                    {errors?.password && (
                      <p className={styles.fieldError}>
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                )}

                {isResetPassword ? (
                  <div className={styles.rememberRow}>
                    <button
                      type="button"
                      className={styles.forgotLink}
                      onClick={() => {
                        reset();
                        setIsResetPassword(false);
                        setShowPassword(false);
                      }}
                    >
                      Login Here
                    </button>
                  </div>
                ) : (
                  <div className={styles.rememberRow}>
                    <label className={styles.rememberLabel}>
                      <input
                        type="checkbox"
                        className={styles.rememberCheckbox}
                      />
                      <span className={styles.rememberText}>
                        Remember me for 30 days
                      </span>
                    </label>
                    <button
                      type="button"
                      className={styles.forgotLink}
                      onClick={() => {
                        reset();
                        setIsResetPassword(true);
                        setShowPassword(false);
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                <div className={styles.submitWrap}>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ButtonLoader />
                    ) : isResetPassword ? (
                      <span>Send Reset Link</span>
                    ) : (
                      <>
                        <span>Log In to Portal</span>
                        <span className={styles.punchBadge}>Punch In</span>
                        <svg
                          className={styles.submitArrow}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {!isResetPassword && (
                <>
                  <div className={styles.divider}>
                    <div className={styles.dividerLine}>
                      <span />
                    </div>
                    <span className={styles.dividerText}>
                      Or continue with enterprise SSO
                    </span>
                  </div>

                  <div className={styles.ssoGrid}>
                    <button type="button" className={styles.ssoButton}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google
                    </button>
                    <button type="button" className={styles.ssoButton}>
                      <svg viewBox="0 0 21 21" aria-hidden="true">
                        <path d="M1 1h9v9H1z" fill="#f25022" />
                        <path d="M1 11h9v9H1z" fill="#00a4ef" />
                        <path d="M11 1h9v9h-9z" fill="#7fba00" />
                        <path d="M11 11h9v9h-9z" fill="#ffb900" />
                      </svg>
                      Microsoft
                    </button>
                  </div>
                </>
              )}

              <div className={styles.securityNote}>
                <p>
                  <svg
                    className={styles.securityIcon}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  Enterprise 256-Bit SSL Encrypted • ISO 27001 Certified
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerMeta}>
            <span className={styles.footerBrand}>
              © 2025 Cynosoft HRMS Portal
            </span>
            <span>•</span>
            <span>Version 3.4.2</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#punch-policy">Punch-in Guidelines</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoginComponent;
