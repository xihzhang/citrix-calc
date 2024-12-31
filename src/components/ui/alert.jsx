export const Alert = ({ children, className = "" }) => (
  <div className={`relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground ${className}`}>
    {children}
  </div>
);

export const AlertDescription = ({ children, className = "" }) => (
  <div className={`text-sm [&_p]:leading-relaxed ${className}`}>{children}</div>
);