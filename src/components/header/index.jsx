import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import styles from "./header.module.css";
import NameBadge from "../NameBadge";
import { supabase } from "@/utils/supabaseClient";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const HeaderComponent = ({ empData }) => {
  const router = useRouter();
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const userId = Cookies.get("user_id");

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

  useEffect(() => {
    if (userId) loadNotifications();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("notifications-changes")
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
  }, [userId]);

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
    <div className={`d-flex justify-content-end ${styles.header}`}>
      <div className={styles.notificationWrap} ref={dropdownRef}>
        <button
          type="button"
          className={styles.notificationBtn}
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Notifications"
        >
          <Image
            src="/assets/icons/bell-black.svg"
            alt="Notifications"
            width={18}
            height={18}
            priority
          />
          {unreadCount > 0 && (
            <span className={styles.badge}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <span className={styles.dropdownTitle}>Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className={styles.markAll}
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              )}
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
        )}
      </div>

      <div className="d-none d-md-block">
        <div className="d-flex align-items-center">
          <span className="me-2">
            {empData?.name ? empData?.name.split(" ")[0] : ""}
          </span>
          {empData?.pic ? (
            <Image
              src={empData?.pic}
              alt="Vercel Logo"
              width={33}
              height={33}
              priority
              className="hrms-profileImage"
            />
          ) : (
            <NameBadge
              name={empData?.name}
              fontSize={15}
              height={27}
              width={27}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderComponent;
