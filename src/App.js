import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Contact from "./pages/Contact";
import Gallery from "./pages/Gallery";
import Artists from "./pages/Artists";
import Artwork from "./pages/Artwork";
import ArtistDetail from "./pages/Artists/artistDetails";
import "./App.css";
import { AppProvider, useAppContext } from "./contexts/AppContext";
import LoadingIndicator from "./components/LoadingIndicator";
import ScrollToTop from "./components/ScrollToTop";

const MainContent = () => {
  const { globalLoading } = useAppContext();

  if (globalLoading) {
    return <LoadingIndicator />;
  }
  return (
    <Router>
      <ScrollToTop />
      <div className="App min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:category" element={<Shop />} />
            <Route path="/artwork/:id" element={<Artwork />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artists/:artistId" element={<ArtistDetail />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};
function App() {
  return (
    // <div className="App">
    //   <header className="App-header">
    //     <img src={logo} className="App-logo" alt="logo" />
    //     <p>
    //       Edit <code>src/App.js</code> and save to reload.
    //     </p>
    //     <a
    //       className="App-link"
    //       href="https://reactjs.org"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       Learn React
    //     </a>
    //   </header>
    // </div>

    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
