import logo from "../images/logo.png";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <div className="header">
      <Link
        to="/"
        style={{ color: "inherit", textDecoration: "none" }}
        title="Go to homepage"
      >
        <img src={logo} alt="Find Your GP Logo" style={{ cursor: "pointer" }} />
      </Link>
    </div>
  );
};

export default Header;
