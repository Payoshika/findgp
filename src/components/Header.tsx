import logo from "../images/logo.png";

const Header = () => {
  return (
    <div className="header">
      <a href="/" style={{ color: "inherit", textDecoration: "none" }}>
        <img src={logo} alt="Find Your GP Logo" />
      </a>
    </div>
  );
};

export default Header;
