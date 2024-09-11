import React, { useEffect, useState } from "react";
import styles from "./login.module.css";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Cookies from "js-cookie";
import { EncryptData } from "@/utils/encrypt";
import { useForm } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button, Col, Row } from "react-bootstrap";
import ButtonLoader from "../ButtonLoader";
import useIsMobile from "@/utils/useIsMobile";

const LoginComponent = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    getValues,
  } = useForm();

  const [isLoading, setIsLoading] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);

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
      } catch (error) {}
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
          Cookies.set("user_id", data?.user?.id);
          Cookies.set("signin_toast", "true");
          const dataExp = EncryptData(data?.session?.expires_at);
          Cookies.set("expires_at", dataExp);
          setIsLoading(false);
          router.push("/hrms/dashboard");
        }
      } catch (error) {
        setIsLoading(false);
        console.log(error);
      }
    }
  };

  return (
    <>
      <ToastContainer />
      <div className={styles.logo}>
        <Image
          src="/assets/images/logo.svg"
          alt="Vercel Logo"
          width={177}
          height={44}
          priority
        />
      </div>
      <div className={styles.container}>
        <Row className="w-100">
          <Col xl={6} lg={6} md={6} sm={12}>
            <div>
              <div className="d-flex justify-content-center">
                <p className={styles.heading}>
                  Ready to check in? Login to mark your
                  <br /> attendance.
                </p>
              </div>

              <div
                className={`${styles.leftPortion} mt-3 d-none d-md-flex justify-content-center`}
              >
                <Image
                  src="/assets/images/login-image.svg"
                  alt="Login Logo"
                  width={433}
                  height={354}
                  priority
                />
              </div>
            </div>
          </Col>
          <Col
            className="d-flex justify-content-center align-items-center"
            xl={6}
            lg={6}
            md={12}
            sm={12}
          >
            <div
              className={isResetPassword ? styles.resetCard : styles.loginCard}
            >
              <div className={`${styles.ballsImage} d-md-block`}>
                <Image
                  src="/assets/images/round-balls.png"
                  alt="Ball Pic"
                  width={isMobile ? 80 : 145}
                  height={isMobile ? 86 : 145}
                  priority
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div className="d-flex justify-content-center text-center">
                <p className={styles.loginHere}>
                  {isResetPassword ? (
                    <>
                      Enter your email to receive <br /> a password reset link.
                    </>
                  ) : (
                    "Login Here"
                  )}
                </p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <div>
                  <span className={styles.fieldText}>Enter your email</span>
                  <div className="mt-2">
                    <input
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value:
                            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                          message: "Invalid email address",
                        },
                      })}
                      className={`${styles.field} w-100`}
                    />
                    {errors?.email && (
                      <p className="hrms-field-error">
                        {errors?.email?.message}
                      </p>
                    )}
                  </div>
                </div>
                {!isResetPassword ? (
                  <div className="mt-3">
                    <span className={styles.fieldText}>
                      Enter your password
                    </span>
                    <div className="mt-2">
                      <input
                        {...register("password", {
                          required: "Password is required",
                          minLength: {
                            value: 6,
                            message: "Password must be at least 6 characters",
                          },
                        })}
                        className={`${styles.field} w-100`}
                        type="password"
                      />
                      {errors?.password && (
                        <p className="hrms-field-error">
                          {errors?.password?.message}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <></>
                )}
                {isResetPassword ? (
                  <div
                    style={{ cursor: "pointer" }}
                    className={`mt-4 ${styles.fieldText}`}
                  >
                    <p
                      onClick={() => {
                        reset();
                        setIsResetPassword(false);
                      }}
                    >
                      <u>Login Here</u>
                    </p>
                  </div>
                ) : (
                  <div className={`mt-4 ${styles.fieldText}`}>
                    <p
                      style={{ cursor: "pointer" }}
                      onClick={() => setIsResetPassword(true)}
                    >
                      <u>Forgot Password ?</u>
                    </p>
                  </div>
                )}

                <div className="mt-5 d-flex justify-content-center">
                  <Button
                    className={`w-100 hrms-button`}
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? <ButtonLoader /> : "Submit"}
                  </Button>
                </div>
              </form>
            </div>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default LoginComponent;
