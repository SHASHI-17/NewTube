interface AuthLayoutProps {
  children?: React.ReactNode;
}
const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      {children}
    </div>
  );
};
export default AuthLayout;
