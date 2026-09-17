import React from "react";
import styles from "./skeleton.module.css";

export const SkeletonBone = ({
  className = "",
  style,
  circle = false,
  ...rest
}) => (
  <span
    className={`${styles.bone} ${circle ? styles.circle : ""} ${className}`}
    style={style}
    aria-hidden="true"
    {...rest}
  />
);

export const SkeletonLine = ({
  width = "100%",
  size = "md",
  className = "",
  style,
}) => {
  const sizeClass =
    size === "sm" ? styles.lineSm : size === "lg" ? styles.lineLg : styles.line;
  return (
    <SkeletonBone
      className={`${sizeClass} ${className}`}
      style={{ width, ...style }}
    />
  );
};

export const SkeletonCircle = ({ size = 40, className = "", style }) => (
  <SkeletonBone
    circle
    className={className}
    style={{ width: size, height: size, ...style }}
  />
);

export const TableSkeletonRows = ({
  rows = 5,
  columns = 6,
  variant = "default",
  rowClassName = "",
  altRowClassName = "",
}) => {
  const colDefs =
    typeof columns === "number"
      ? Array.from({ length: columns }, (_, i) => {
          if (variant === "avatar" && i === 0) return { type: "avatar" };
          if (
            (variant === "avatar" || variant === "actions") &&
            i === columns - 1
          ) {
            return { type: "actions", count: 2 };
          }
          return { type: "text", width: i % 2 === 0 ? "72%" : "55%" };
        })
      : columns;

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr
          key={`skel-row-${rowIndex}`}
          className={`${styles.skelRow} ${rowClassName} ${
            rowIndex % 2 === 1 ? altRowClassName : ""
          }`}
          {...(rowIndex === 0
            ? { "aria-busy": "true" }
            : { "aria-hidden": "true" })}
        >
          {colDefs.map((col, colIndex) => {
            const type = typeof col === "string" ? col : col?.type || "text";
            const width =
              typeof col === "object" && col?.width ? col.width : "65%";
            const actionCount =
              typeof col === "object" && col?.count ? col.count : 2;

            if (type === "avatar") {
              return (
                <td key={`skel-cell-${rowIndex}-${colIndex}`}>
                  <div className={styles.avatarCell}>
                    <SkeletonBone className={`${styles.avatar} ${styles.circle}`} />
                    <div className={styles.cellStack} style={{ flex: 1 }}>
                      <SkeletonLine width="70%" />
                      <SkeletonLine width="45%" size="sm" />
                    </div>
                  </div>
                </td>
              );
            }

            if (type === "actions") {
              return (
                <td key={`skel-cell-${rowIndex}-${colIndex}`}>
                  <div className={styles.actionsCell}>
                    {Array.from({ length: actionCount }).map((_, i) => (
                      <SkeletonBone
                        key={`skel-action-${rowIndex}-${i}`}
                        className={styles.actionBtn}
                      />
                    ))}
                  </div>
                </td>
              );
            }

            if (type === "badge") {
              return (
                <td key={`skel-cell-${rowIndex}-${colIndex}`}>
                  <SkeletonBone
                    style={{
                      width: width === "100%" ? "4.5rem" : width,
                      height: "1.25rem",
                      borderRadius: "9999px",
                    }}
                  />
                </td>
              );
            }

            return (
              <td key={`skel-cell-${rowIndex}-${colIndex}`}>
                <SkeletonLine width={width} />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
};

export const MetricCardsSkeleton = ({ count = 4, columnsClass = "" }) => (
  <div
    className={`${styles.metricsGrid} ${columnsClass}`}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <span className={styles.srOnly}>Loading metrics…</span>
    {Array.from({ length: count }).map((_, i) => (
      <div key={`metric-skel-${i}`} className={styles.metricCard}>
        <div className={styles.metricTop}>
          <div style={{ flex: 1 }}>
            <SkeletonBone className={styles.metricLabel} />
            <SkeletonBone className={styles.metricValue} />
          </div>
          <SkeletonBone className={`${styles.metricIcon} ${styles.circle}`} />
        </div>
        <SkeletonBone className={styles.metricFooter} />
        <SkeletonBone className={styles.progress} />
      </div>
    ))}
  </div>
);

export const ProfileSkeleton = ({ size = "md", showMeta = true }) => (
  <div className={styles.profileCard} aria-busy="true">
    <SkeletonBone
      className={`${styles.circle} ${
        size === "sm" ? styles.profileAvatarSm : styles.profileAvatar
      }`}
    />
    <div className={styles.profileText}>
      <SkeletonBone className={styles.profileName} />
      {showMeta ? <SkeletonBone className={styles.profileMeta} /> : null}
    </div>
  </div>
);

export const ChartSkeleton = ({ className = "" }) => (
  <SkeletonBone className={`${styles.chartBlock} ${className}`} />
);

export const StatusPillSkeleton = () => (
  <div className={styles.statusPill} aria-busy="true">
    <SkeletonBone className={`${styles.statusDot} ${styles.circle}`} />
    <SkeletonBone className={styles.statusLabel} />
  </div>
);

export const PageShellSkeleton = ({
  showMetrics = true,
  metricCount = 4,
  showChart = false,
  showTable = false,
  tableColumns = 6,
  tableRows = 5,
  tableVariant = "default",
}) => (
  <div className={styles.pageShell} role="status" aria-busy="true">
    <span className={styles.srOnly}>Loading page…</span>
    <div className={styles.shellHeader}>
      <SkeletonBone className={styles.shellTitle} />
      <SkeletonBone className={styles.shellSubtitle} />
    </div>
    {showMetrics ? <MetricCardsSkeleton count={metricCount} /> : null}
    {showChart ? <ChartSkeleton /> : null}
    {showTable ? (
      <div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <TableSkeletonRows
              rows={tableRows}
              columns={tableColumns}
              variant={tableVariant}
            />
          </tbody>
        </table>
      </div>
    ) : null}
  </div>
);

export default {
  SkeletonBone,
  SkeletonLine,
  SkeletonCircle,
  TableSkeletonRows,
  MetricCardsSkeleton,
  ProfileSkeleton,
  ChartSkeleton,
  StatusPillSkeleton,
  PageShellSkeleton,
};
