import bmcImg from "../images/bmc.png";

const Footer = () => {
  return (
    <footer className="footer">
      <a href="/about" className="footer-link">
        <strong>About FindGP</strong>
      </a>
      <a href="/how-it-works" className="footer-link">
        <strong>How it Works</strong>
      </a>
      <a
        href="https://buymeacoffee.com/studyinthiscorner"
        target="_blank"
        rel="noopener noreferrer"
        className="footer-link"
      >
        <img src={bmcImg} alt="Buy Me a Coffee" />
        <strong>Buy Me a Coffee</strong>
      </a>
    </footer>
  );
};

export default Footer;
