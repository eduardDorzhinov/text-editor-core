import styles from "./EditorSkeleton.module.scss";

export function EditorSkeleton() {
  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <div className={styles.btnSkeleton} />
          <div className={styles.btnSkeleton} />
          <div className={styles.divider} />
          <div className={styles.blockSkeleton} />
          <div className={styles.divider} />
          <div className={styles.btnSkeleton} />
          <div className={styles.btnSkeleton} />
          <div className={styles.btnSkeleton} />
          <div className={styles.btnSkeleton} />
          <div className={styles.divider} />
          <div className={styles.blockSkeleton} />
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.lineH1} />
        <div className={styles.line} />
        <div className={styles.line} />
        <div className={styles.lineShort} />
        <div className={styles.spacer} />
        <div className={styles.lineH2} />
        <div className={styles.line} />
        <div className={styles.line} />
        <div className={styles.line} />
        <div className={styles.lineShort} />
        <div className={styles.spacer} />
        <div className={styles.line} />
        <div className={styles.line} />
      </div>
    </div>
  );
}
