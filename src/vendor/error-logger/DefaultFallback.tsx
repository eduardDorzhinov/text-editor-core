interface Props {
  title?: string,
  description?: string,
  onRetry?: () => void,
}

export const DefaultFallback = ({
  title = "Что-то пошло не так",
  description,
  onRetry,
}: Props) => (
  <div
    style={
      {
        padding: "16px",
        borderRadius: "8px",
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#991b1b",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
      }
    }
  >
    <div style={{ fontWeight: 600, marginBottom: "4px" }}>
      {title}
    </div>
    {
      description && (
        <div
          style={
            {
              color: "#b91c1c",
              fontSize: "12px",
              marginBottom: onRetry ?
                "8px" :
                0,
            }
          }
        >
          {description}
        </div>
      )
    }
    {
      onRetry && (
        <button
          style={
            {
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #fecaca",
              backgroundColor: "#fff",
              color: "#991b1b",
              cursor: "pointer",
              fontSize: "12px",
            }
          }
          onClick={onRetry}
        >
          Попробовать снова
        </button>
      )
    }
  </div>
);
