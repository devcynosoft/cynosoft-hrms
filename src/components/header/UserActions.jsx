"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { supabase } from "@/utils/supabaseClient";
import NameBadge from "../NameBadge";
import { SkeletonCircle } from "../skeletons";
import styles from "./userActions.module.css";

/**
 * Reusable header actions: notifications dropdown + profile avatar.
 * @param {"default"|"mobile"} variant - mobile uses light-on-dark styling for the top bar
 */
const UserActions = ({ empData, isEmployeeLoading = false, variant = "default" }) => {
  const router = useRouter();
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const userId = Cookies.get("user_id");
  const isMobile = variant === "mobile";

  const unreadCount = useMemo(
    () => notifications?.filter((n) => !n?.is_read).length || 0,
    [notifications]
  );

  const loadNotifications = async () => {
    const response = await fetch("/api/notifications/get-all?limit=20", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (response.status === 200) {
      setNotifications(result?.data || []);
    }
  };

  const markRead = async (id) => {
    await fetch("/api/notifications/mark-read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/mark-read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n?.is_read) {
        await markRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
        );
      }
    } finally {
      setIsOpen(false);
      if (n?.url) router.push(n.url);
    }
  };

  const handleAvatarClick = () => {
    if (empData?.id) {
      router.push(`/hrms/employee/edit/${empData.id}`);
    }
  };

  useEffect(() => {
    if (userId) loadNotifications();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-changes-${variant}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload?.eventType === "INSERT" && payload?.new?.message) {
            toast.info(payload.new.message, {
              position: "bottom-right",
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "colored",
            });
          }
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, variant]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!isOpen) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isOpen]);

  return (
    <div
      className={`${styles.actions} ${isMobile ? styles.actionsMobile : ""}`}
    >
      <div className={styles.notificationWrap} ref={dropdownRef}>
        <button
          type="button"
          className={`${styles.notificationBtn} ${
            isMobile ? styles.notificationBtnMobile : ""
          }`}
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            notifications
          </span>
          {unreadCount > 0 ? <span className={styles.badge} /> : null}
        </button>

        {isOpen ? (
          <div
            className={`${styles.dropdown} ${
              isMobile ? styles.dropdownMobile : ""
            }`}
          >
            <div className={styles.dropdownHeader}>
              <span className={styles.dropdownTitle}>Notifications</span>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  className={styles.markAll}
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              ) : null}
            </div>

            {notifications?.length ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`${styles.item} ${
                    !n?.is_read ? styles.itemUnread : ""
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className={styles.itemMessage}>{n?.message}</div>
                  <div className={styles.itemMeta}>
                    {new Date(n?.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No notifications yet.</div>
            )}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={`${styles.avatarBtn} ${
          isMobile ? styles.avatarBtnMobile : ""
        }`}
        onClick={handleAvatarClick}
        aria-label="Open profile"
        disabled={!empData?.id || isEmployeeLoading}
      >
        <span className={styles.avatar}>
          {isEmployeeLoading ? (
            <SkeletonCircle size={32} />
          ) : empData?.pic ? (
            <Image
              src={empData.pic}
              alt="Profile"
              width={32}
              height={32}
              style={{ borderRadius: "9999px", objectFit: "cover" }}
              priority
            />
          ) : empData?.name ? (
            <NameBadge
              name={empData.name}
              fontSize={12}
              height={32}
              width={32}
            />
          ) : (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              person
            </span>
          )}
        </span>
      </button>
    </div>
  );
};

export default UserActions;
