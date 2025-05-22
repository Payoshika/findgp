import "./styles/App.scss";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Map from "./components/Map";
import Result from "./components/Result";
import Search from "./components/Search";
import HowItWorks from "./components/HowItWorks";

import { MapProvider } from "./context/MapContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import About from "./components/About";

function App() {
  return (
    <div className="container">
      <Header />
      <Router>
        <Routes>
          <Route
            path=""
            element={
              <MapProvider>
                <>
                  <Search />
                  <Map />
                  <Result />
                </>
              </MapProvider>
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
        </Routes>
      </Router>
      <Footer />
    </div>
  );
}

export default App;
