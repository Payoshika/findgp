import React from "react";
import bmcImg from "../images/bmc.png";

const Footer = () => {
  return (
    <footer className="footer">
      <a href="/about" className="footer-link">
        About Find GP
      </a>
      <a
        href="https://buymeacoffee.com/studyinthiscorner"
        target="_blank"
        rel="noopener noreferrer"
        className="footer-link"
      >
        <img src={bmcImg} alt="Buy Me a Coffee" />
        Buy Me a Coffee
      </a>
    </footer>
  );
};

export default Footer;
