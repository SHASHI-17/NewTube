import HomeLayout from "@/modules/home/ui/layouts/home-layouts";

interface layoutProps {
  children?: React.ReactNode;
}
const Layout = ({ children }: layoutProps) => {
  return <HomeLayout>{children}</HomeLayout>;
};
export default Layout;
