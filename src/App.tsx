import "./styles/App.scss";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Map from "./components/Map";
import Result from "./components/Result";
import Search from "./components/Search";
import { MapProvider } from "./context/MapContext";

function App() {
  return (
    <>
      <Header />
      <MapProvider>
        <Search />
        <Map />
        <Result />
      </MapProvider>
      <Footer />
    </>
  );
}

export default App;
