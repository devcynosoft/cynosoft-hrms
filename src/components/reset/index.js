import React, { useEffect, useState } from "react";
import styles from "./reset.module.css";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { useForm } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button, Col, Row } from "react-bootstrap";
import ButtonLoader from "../ButtonLoader";

const ResetPasswordComponent = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
    getValues,
  } = useForm();

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (formData) => {
    const { password } = formData;
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setIsLoading(false);
        toast.error(error.message, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        return false;
      } else {
        setIsLoading(false);
        toast.success("Successfully reset your password", {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        router.push("/hrms/login");
      }
    } catch (error) {
      setIsLoading(false);
      console.log(error);
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
        <Row>
          <Col
            className="d-flex justify-content-center"
            xl={12}
            lg={12}
            md={12}
            sm={12}
          >
            <div className={styles.loginCard}>
              <div className={`${styles.ballsImage} d-none d-md-block`}>
                <Image
                  src="/assets/images/round-balls.png"
                  alt="Ball Pic"
                  width={145}
                  height={145}
                  priority
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div className="d-flex justify-content-center text-center">
                <p className={styles.loginHere}>Reset your password</p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <div className="mt-3">
                  <span className={styles.fieldText}>Enter your password</span>
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
                <div className="mt-3">
                  <span className={styles.fieldText}>
                    Enter confirm password
                  </span>
                  <div className="mt-2">
                    <input
                      {...register("con_password", {
                        required: "Please confirm your password",
                        validate: (value) =>
                          value === watch("password") ||
                          "Passwords don't match",
                      })}
                      className={`${styles.field} w-100`}
                      type="password"
                    />
                    {errors?.con_password && (
                      <p className="hrms-field-error">
                        {errors?.con_password?.message}
                      </p>
                    )}
                  </div>
                </div>

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

export default ResetPasswordComponent;
