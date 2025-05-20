import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Map from "./components/Map";
import Result from "./components/Result";
import Search from "./components/Search";

function App() {
  return (
    <>
      <Header />
      <Search />
      <Map />
      <Result />
      <Footer />
    </>
  );
}

export default App;
