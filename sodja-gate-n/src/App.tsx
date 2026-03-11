import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useLocation 
} from 'react-router-dom';
import { 
  ShoppingBag, 
  User, 
  Calendar, 
  TrendingUp, 
  MessageSquare, 
  LogOut, 
  Plus, 
  Edit,
  Minus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  Star,
  LayoutDashboard,
  Package,
  CreditCard,
  Users,
  Mail,
  Smartphone,
  Bell,
  Info,
  ArrowRight,
  ShieldCheck,
  Zap,
  Leaf,
  Heart,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import emailjs from '@emailjs/browser';
import { supabase } from './services/supabase';
import { AdminOrders } from './components/AdminOrders';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SHOP_LAT = 6.1319; // Lomé, Togo (Central)
const SHOP_LNG = 1.2228;

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

// --- Types ---
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface User {
  id: string;
  nom: string;
  whatsapp: string;
  quartier?: string;
  is_admin: boolean;
  email?: string;
}

interface Notification {
  id: number;
  user_id: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: any | null;
  logout: () => Promise<void>;
}

// --- Contexts ---
const AuthContext = createContext<AuthContextType | null>(null);
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const CartContext = createContext<{
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, delta: number) => void;
  clearCart: () => void;
  total: number;
} | null>(null);

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

// --- Components ---

const Navbar = () => {
  const { user, session, logout } = useAuth();
  const { cart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Check every 30s
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (user && supabase) {
      const channel = supabase
        .channel('public:notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const markAsRead = async () => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      
      if (!response.ok) throw new Error('Failed to mark as read');
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-gray-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-secondary font-bold text-2xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">SG</div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-primary tracking-tight leading-none">SODJA GATE</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-semibold">Qualité Premium</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-10">
            <Link to="/" className="text-gray-600 hover:text-primary font-semibold transition-all hover:scale-105">Accueil</Link>
            <Link to="/reservations" className="text-gray-600 hover:text-primary font-semibold transition-all hover:scale-105">Réservations</Link>
            <Link to="/investir" className="text-gray-600 hover:text-primary font-semibold transition-all hover:scale-105">Investir</Link>
            <Link to="/suggestions" className="text-gray-600 hover:text-primary font-semibold transition-all hover:scale-105">Suggestions</Link>
            {user?.is_admin && (
              <Link to="/admin" className="text-accent hover:text-accent/80 font-bold flex items-center gap-1 animate-pulse">
                <LayoutDashboard size={18} /> Admin
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications && unreadCount > 0) markAsRead();
                  }}
                  className="p-2 text-gray-600 hover:text-primary transition-colors relative"
                >
                  <Bell size={24} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-accent text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="font-bold">Notifications</h3>
                        <button onClick={() => setShowNotifications(false)}><X size={16} /></button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-400 text-sm">Aucune notification</div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={cn("p-4 border-b border-gray-50 last:border-0", !n.is_read && "bg-primary/5")}>
                              <p className="text-sm text-gray-800">{n.message}</p>
                              <span className="text-[10px] text-gray-400 mt-1 block">{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <Link to="/panier" className="relative p-2 text-gray-600 hover:text-primary transition-all hover:scale-110">
              <ShoppingBag size={24} />
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={cartCount}
                  className="absolute top-0 right-0 bg-secondary text-primary text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm"
                >
                  {cartCount}
                </motion.span>
              )}
            </Link>
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="hidden sm:inline text-sm font-medium text-gray-700">Salut, {user.nom.split(' ')[0]}</span>
                <button onClick={logout} className="p-2 text-gray-400 hover:text-accent transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary text-sm px-4 py-2">Connexion</Link>
            )}
            <button className="md:hidden p-2 text-gray-600" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              <Link to="/" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50">Accueil</Link>
              <Link to="/reservations" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50">Réservations</Link>
              <Link to="/investir" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50">Investir</Link>
              <Link to="/suggestions" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50">Suggestions</Link>
              {user?.is_admin && (
                <Link to="/admin" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-primary font-bold">Admin Dashboard</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => {
  const auth = useAuth();
  const isAdmin = auth?.user?.is_admin;

  return (
    <footer className="bg-gray-50 border-t border-gray-100 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-3 mb-6 group">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-secondary font-bold text-2xl shadow-lg shadow-primary/20">SG</div>
              <span className="text-2xl font-black text-primary tracking-tight">SODJA GATE</span>
            </Link>
            <p className="text-gray-500 max-w-sm mb-8 leading-relaxed text-lg">
              Votre partenaire santé et gourmandise au Togo. Nous transformons le soja avec passion pour vous offrir le meilleur de la nature.
            </p>
            <div className="flex space-x-4">
              {['facebook', 'instagram', 'twitter'].map(social => (
                <a key={social} href="#" className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white hover:scale-110 transition-all">
                  <Smartphone size={20} />
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-black text-lg text-gray-900 mb-8">Navigation</h4>
            <ul className="space-y-4 text-gray-500 font-medium">
              <li><Link to="/" className="hover:text-primary transition-colors">Accueil</Link></li>
              <li><Link to="/reservations" className="hover:text-primary transition-colors">Réservations</Link></li>
              <li><Link to="/investir" className="hover:text-primary transition-colors">Investir</Link></li>
              <li><Link to="/suggestions" className="hover:text-primary transition-colors">Suggestions</Link></li>
              {isAdmin && (
                <li><Link to="/admin" className="text-accent hover:text-accent/80 font-bold">Admin Dashboard</Link></li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-black text-lg text-gray-900 mb-8">Contact</h4>
            <ul className="space-y-5 text-gray-500 font-medium">
              <li className="flex items-center gap-3"><Smartphone size={20} className="text-primary" /> +228 71 00 05 88</li>
              <li className="flex items-center gap-3"><Mail size={20} className="text-primary" /> sodjagate@gmail.com</li>
              <li className="flex items-center gap-3"><Info size={20} className="text-primary" /> Lomé, Togo</li>
            </ul>
          </div>
        </div>
        <div className="pt-10 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 text-gray-400 text-sm font-medium">
          <div className="flex flex-col gap-2">
            <p>© {new Date().getFullYear()} SODJA GATE. Tous droits réservés.</p>
            <div className="flex items-center gap-2 text-[10px] opacity-60">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Base de données : <span className="font-bold">Supabase Cloud</span>
            </div>
          </div>
          <div className="flex gap-10">
            <a href="#" className="hover:text-primary transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-primary transition-colors">Conditions d'utilisation</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// --- Pages ---

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async (retries = 5, delay = 2000) => {
      try {
        // Add cache-buster to prevent receiving a cached HTML response
        const response = await fetch(`/api/products?t=${Date.now()}`);
        const contentType = response.headers.get("content-type");
        
        console.log(`[Fetch] /api/products status: ${response.status}, type: ${contentType}`);
        
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Non-JSON response received. First 200 chars:", text.substring(0, 200));
          
          if (retries > 0) {
            console.log(`Retrying in ${delay}ms... (${retries} retries left)`);
            setTimeout(() => fetchProducts(retries - 1, delay * 1.5), delay);
            return;
          }
          
          throw new Error("Le serveur a renvoyé une réponse invalide (HTML au lieu de JSON). Le serveur est peut-être en cours de redémarrage. Veuillez patienter 10 secondes et réessayer.");
        }

        if (!response.ok) {
          // If 503, it means DB is not ready yet, we should also retry
          if (response.status === 503 && retries > 0) {
            console.log(`DB not ready (503). Retrying in ${delay}ms... (${retries} retries left)`);
            setTimeout(() => fetchProducts(retries - 1, delay * 1.5), delay);
            return;
          }
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Erreur lors du chargement des produits');
        }

        const data = await response.json();
        setProducts(data || []);
        setError(null);
        setLoading(false);
      } catch (err: any) {
        console.error("Failed to fetch products:", err);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[3rem] bg-primary px-8 py-24 md:py-40">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 text-white text-sm font-bold mb-10 backdrop-blur-md border border-white/20"
          >
            <Leaf size={16} className="text-secondary" /> 100% Naturel • Artisanal • Local
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black text-white leading-[1] mb-10 tracking-tighter"
          >
            Le goût authentique du <span className="text-secondary italic">Soja</span> <br />
            <span className="text-white/90">au Togo.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/70 text-xl md:text-2xl mb-12 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Savourer la santé n'a jamais été aussi simple. 
            Découvrez nos créations artisanales livrées directement chez vous.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-6"
          >
            <a href="#produits" className="btn btn-secondary text-xl px-10 py-5 shadow-2xl shadow-secondary/20 hover:scale-105 transition-transform">
              Commander maintenant <ArrowRight size={22} />
            </a>
            <Link to="/reservations" className="btn bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/20 text-xl px-10 py-5 hover:scale-105 transition-transform">
              Réserver un événement
            </Link>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(242,125,38,0.15),transparent_70%)] pointer-events-none" />
        <div className="absolute -bottom-48 -left-48 w-[40rem] h-[40rem] bg-secondary rounded-full blur-[120px] opacity-10" />
        <div className="absolute -top-48 -right-48 w-[40rem] h-[40rem] bg-accent rounded-full blur-[120px] opacity-10" />
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 hidden xl:block opacity-20">
          <Star size={120} className="text-secondary animate-spin-slow" />
        </div>
        <div className="absolute bottom-20 right-10 hidden xl:block opacity-20">
          <Leaf size={120} className="text-white animate-bounce-slow" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
        {[
          { label: "Clients Heureux", value: "2.5k+" },
          { label: "Points de Vente", value: "12" },
          { label: "Produits Bio", value: "100%" },
          { label: "Livraisons", value: "5k+" }
        ].map((stat, i) => (
          <div key={i} className="text-center">
            <p className="text-4xl font-black text-primary mb-2">{stat.value}</p>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Products Section */}
      <section id="produits" className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-16">
          <div className="text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Notre Menu</h2>
            <p className="text-gray-500 text-lg">Des créations artisanales pour tous les goûts.</p>
          </div>
          <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
            {['Tous', 'Soja', 'Accompagnements'].map(cat => (
              <button key={cat} className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                cat === 'Tous' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-primary"
              )}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 aspect-square rounded-[2rem] mb-6" />
                <div className="h-6 bg-gray-200 rounded-full w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded-full w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-amber-50 border-2 border-amber-100 rounded-[2rem] p-12 text-center max-w-2xl mx-auto">
            <AlertCircle className="mx-auto text-amber-500 mb-6" size={64} />
            <h3 className="text-2xl font-black text-amber-900 mb-4">Oups ! Problème de connexion</h3>
            <p className="text-amber-700 mb-8 leading-relaxed">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary px-10 py-4 text-lg font-bold"
            >
              Réessayer maintenant
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="card group h-full flex flex-col"
              >
                <div className="relative aspect-square overflow-hidden m-3 rounded-[1.5rem]">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 glass px-4 py-2 rounded-2xl text-primary font-black shadow-xl text-sm">
                    {product.price} <span className="text-[10px] font-bold opacity-60">FCFA</span>
                  </div>
                  {product.price > 500 && (
                    <div className="absolute top-4 left-4 bg-accent text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Populaire
                    </div>
                  )}
                </div>
                <div className="p-6 pt-2 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-xl group-hover:text-primary transition-colors">{product.name}</h3>
                  </div>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-2 flex-grow leading-relaxed">{product.description}</p>
                  <button 
                    onClick={() => addToCart(product)}
                    className="w-full btn btn-primary py-4 group-hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                  >
                    <ShoppingBag size={20} /> Ajouter au panier
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">Comment ça marche ?</h2>
          <p className="text-gray-500">Votre commande en 3 étapes simples.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { step: "01", title: "Choisissez", desc: "Parcourez notre menu et sélectionnez vos produits préférés." },
            { step: "02", title: "Commandez", desc: "Validez votre panier et choisissez votre mode de paiement." },
            { step: "03", title: "Savourez", desc: "Nous livrons chez vous en un temps record. Bon appétit !" }
          ].map((item, i) => (
            <div key={i} className="relative group">
              <span className="text-8xl font-black text-gray-100 absolute -top-10 -left-4 z-0 group-hover:text-primary/10 transition-colors">{item.step}</span>
              <div className="relative z-10">
                <h4 className="text-2xl font-black mb-4">{item.title}</h4>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Us Section */}
      <section className="bg-gray-50 rounded-[3rem] p-12 md:p-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="max-w-3xl mx-auto text-center mb-20 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-6">L'excellence SODJA GATE</h2>
          <p className="text-gray-500 text-lg">Nous redéfinissons la consommation du soja au Togo avec passion et rigueur.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {[
            { icon: <ShieldCheck className="text-primary" />, title: "Qualité Certifiée", desc: "Chaque grain est sélectionné avec soin pour garantir une pureté irréprochable." },
            { icon: <Heart className="text-accent" />, title: "Fait avec Amour", desc: "Nos recettes artisanales préservent toutes les saveurs et bienfaits du soja." },
            { icon: <Zap className="text-secondary" />, title: "Service Rapide", desc: "Livraison express à Lomé pour que vous profitiez de vos plats toujours frais." }
          ].map((feature, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -10 }}
              className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 text-center"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:bg-primary/10 transition-colors">
                {React.cloneElement(feature.icon as React.ReactElement<{ size: number }>, { size: 40 })}
              </div>
              <h4 className="font-black text-2xl mb-4">{feature.title}</h4>
              <p className="text-gray-500 leading-relaxed text-base">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black mb-4">Ce que disent nos clients</h2>
          <div className="flex justify-center gap-1 text-secondary">
            {[1,2,3,4,5].map(i => <Star key={i} size={20} fill="currentColor" />)}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: "Afi K.", role: "Cliente fidèle", text: "Le meilleur lait de soja que j'ai goûté à Lomé. On sent vraiment la différence de qualité !" },
            { name: "Koffi M.", role: "Entrepreneur", text: "Le mix soja-spaghetti-saucisse est mon déjeuner préféré. Copieux et délicieux." },
            { name: "Mablé T.", role: "Maman", text: "Je commande les grains de soja pour toute la famille. C'est propre et très nutritif." }
          ].map((t, i) => (
            <div key={i} className="bg-gray-50 p-8 rounded-3xl border border-gray-100 italic text-gray-600 relative">
              <MessageSquare className="absolute -top-4 -left-4 text-primary/20" size={40} />
              <p className="mb-6 relative z-10">"{t.text}"</p>
              <div className="flex items-center gap-3 not-italic">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">{t.name[0]}</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="bg-primary rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Restez informé !</h2>
          <p className="text-white/70 text-lg mb-10">Inscrivez-vous pour recevoir nos offres exclusives et nos nouveaux produits directement par email.</p>
          <form className="flex flex-col sm:flex-row gap-4" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Votre adresse email" 
              className="flex-1 px-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:bg-white/20 transition-all"
            />
            <button className="btn btn-secondary px-8 py-4 text-lg font-bold">S'abonner</button>
          </form>
          <p className="text-white/40 text-xs mt-6 italic">Nous respectons votre vie privée. Pas de spam, promis !</p>
        </div>
      </section>
    </div>
  );
};

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, total, clearCart } = useCart();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'T-Money' | 'Livraison'>('T-Money');
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(0);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

  const calculateDelivery = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = getDistance(
          SHOP_LAT, SHOP_LNG,
          latitude, longitude
        );
        const fee = Math.round(dist * 75);
        setDistance(dist);
        setDeliveryFee(fee);
        setCoords({ lat: latitude, lng: longitude });
        setLocating(false);
      },
      (error) => {
        console.error(error);
        alert("Impossible d'obtenir votre position précise. Veuillez vérifier vos permissions GPS.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const finalTotal = total + (deliveryFee || 0);

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!deliveryFee || !coords) {
      alert("La géolocalisation est obligatoire pour calculer les frais de livraison et valider votre commande.");
      calculateDelivery();
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart,
          total_amount: finalTotal,
          delivery_fee: deliveryFee || 0,
          payment_method: paymentMethod === 'T-Money' ? 'T-Money (+228 71000588)' : 'Paiement à la livraison',
          user_lat: coords?.lat,
          user_lng: coords?.lng
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erreur lors de la commande');

      setSuccess(true);
      clearCart();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Une erreur est survenue lors de la validation de votre commande.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const whatsappMsg = `Bonjour SODJA GATE, je viens de passer une commande de ${finalTotal} FCFA.
Produits: ${cart.map(i => `${i.name} (x${i.quantity})`).join(', ')}
Prix total: ${finalTotal} FCFA
Quartier: ${user?.quartier || 'Non précisé'}
Localisation: https://www.google.com/maps?q=${coords?.lat},${coords?.lng}
Méthode: ${paymentMethod === 'T-Money' ? 'Payé par T-Money' : 'Paiement à la livraison'}

Merci de me livrer rapidement !`;

    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg"
        >
          <CheckCircle size={56} />
        </motion.div>
        <h2 className="text-3xl font-black mb-4 text-green-600 uppercase tracking-tight">Commande Soumise !</h2>
        <div className="bg-green-50 p-6 rounded-3xl mb-8 border-2 border-green-100">
          <p className="text-green-800 font-bold text-lg mb-2">Succès de la soumission</p>
          <p className="text-green-700">
            Votre commande a été soumise avec succès. 
            <span className="block mt-2 font-black text-xl">L'équipe de livraison vous contactera dans moins de 3 min pour la livraison.</span>
            <span className="block mt-1 text-sm opacity-80 italic">(Le prix de livraison dépend du Km : 1km = 75 fr)</span>
          </p>
        </div>
        
        {paymentMethod === 'T-Money' && (
          <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-3xl text-sm text-amber-900 shadow-sm">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <Zap size={20} className="text-amber-600" />
              <p className="font-black uppercase tracking-wider">Action Immédiate Requise</p>
            </div>
            <p className="mb-4">Veuillez effectuer le transfert T-Money du montant exact de <strong>{total} FCFA</strong> (hors frais de livraison à payer au livreur) sur le numéro :</p>
            <div className="bg-white p-4 rounded-2xl font-black text-2xl text-primary border border-amber-100 mb-2">
              +228 71 00 05 88
            </div>
            <p className="text-xs opacity-70 italic">Indiquez votre nom dans le motif du transfert.</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <a 
            href={`https://wa.me/22871000588?text=${encodeURIComponent(whatsappMsg)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn bg-[#25D366] text-white hover:bg-[#128C7E] flex items-center justify-center gap-3 py-4 text-lg font-bold shadow-xl hover:scale-105 transition-transform"
          >
            <MessageSquare size={24} />
            Confirmer sur WhatsApp
          </a>
          <Link to="/" className="text-gray-400 font-bold hover:text-primary transition-colors py-2">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-4">Votre panier est vide</h2>
        <p className="text-gray-500 mb-8">Il semble que vous n'ayez pas encore ajouté de produits.</p>
        <Link to="/" className="btn btn-primary">Découvrir nos produits</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-12">Votre Panier</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center gap-6 p-4 bg-white rounded-2xl border border-gray-100">
              <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover rounded-xl" referrerPolicy="no-referrer" />
              <div className="flex-1">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-primary font-bold">{item.price} FCFA</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold w-6 text-center">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button 
                onClick={() => removeFromCart(item.id)}
                className="p-2 text-gray-400 hover:text-accent"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="card p-8 sticky top-24">
            <h3 className="text-xl font-bold mb-6">Résumé</h3>
            
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">Mode de paiement</label>
              <div className="space-y-2">
                <button 
                  onClick={() => setPaymentMethod('T-Money')}
                  className={cn(
                    "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between",
                    paymentMethod === 'T-Money' ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-gray-200 hover:border-primary/50"
                  )}
                >
                  <span className="text-sm font-medium">T-Money (+228 71000588)</span>
                  {paymentMethod === 'T-Money' && <CheckCircle size={16} className="text-primary" />}
                </button>
                <button 
                  onClick={() => setPaymentMethod('Livraison')}
                  className={cn(
                    "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between",
                    paymentMethod === 'Livraison' ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-gray-200 hover:border-primary/50"
                  )}
                >
                  <span className="text-sm font-medium">Paiement à la livraison</span>
                  {paymentMethod === 'Livraison' && <CheckCircle size={16} className="text-primary" />}
                </button>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-500">
                <span>Sous-total produits</span>
                <span>{total} FCFA</span>
              </div>
              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Frais de livraison</span>
                  {deliveryFee !== null ? (
                    <span className="text-primary font-bold">{deliveryFee} FCFA</span>
                  ) : (
                    <span className="text-accent text-[10px] font-bold animate-pulse">Action requise</span>
                  )}
                </div>
                
                {deliveryFee === null ? (
                  <button 
                    onClick={calculateDelivery}
                    disabled={locating}
                    className="w-full mt-2 btn bg-primary/10 text-primary hover:bg-primary/20 py-2 text-xs flex items-center justify-center gap-2 border border-primary/20"
                  >
                    {locating ? <Clock size={14} className="animate-spin" /> : <Smartphone size={14} />}
                    Activer ma position (75 CFA/km)
                  </button>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold">
                      <ShieldCheck size={12} /> Position précise activée
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Distance : {distance !== null ? distance.toFixed(2) : "0.00"} km
                    </p>
                    <button 
                      onClick={calculateDelivery}
                      className="text-[10px] text-primary hover:underline text-left"
                    >
                      Mettre à jour ma position
                    </button>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between font-black text-2xl">
                <span>Total</span>
                <div className="text-right">
                  <span className="text-primary block">{finalTotal} FCFA</span>
                  {deliveryFee === null && <span className="text-[10px] text-gray-400 font-normal italic">En attente de localisation</span>}
                </div>
              </div>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={loading}
              className={cn(
                "w-full btn py-4 flex items-center justify-center gap-2 shadow-xl transition-all",
                deliveryFee === null ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "btn-primary hover:scale-[1.02]"
              )}
            >
              {loading ? <Clock className="animate-spin" /> : <ShoppingBag size={20} />}
              {deliveryFee === null ? "Position requise" : "Confirmer la commande"}
            </button>
            <p className="mt-4 text-center text-[10px] text-gray-400 leading-relaxed">
              La géolocalisation est obligatoire pour garantir une livraison précise en moins de 3 minutes. 
              <br /><strong>1km = 75 FCFA</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Auth = ({ type }: { type: 'login' | 'register' }) => {
  const [formData, setFormData] = useState({ nom: '', whatsapp: '', quartier: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (type === 'login') {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            whatsapp: formData.whatsapp,
            password: formData.password
          })
        });
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Le serveur a renvoyé une réponse invalide (HTML au lieu de JSON). Le serveur est peut-être en cours de redémarrage. Veuillez patienter 10 secondes et réessayer.");
        }

        const result = await response.json();
        
        if (response.status === 503) {
          throw new Error(result.message || "Le serveur démarre. Veuillez patienter quelques secondes.");
        }

        if (!response.ok) throw new Error(result.error || 'Erreur de connexion');
        
        // Store token and user
        localStorage.setItem('token', result.token);
        // The App component will detect the login via its own state management if we trigger a reload or update context
        window.location.href = '/';
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas.');
        }

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: formData.nom,
            whatsapp: formData.whatsapp,
            quartier: formData.quartier,
            email: formData.email,
            password: formData.password
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Erreur lors de l'inscription");

        // Navigate to verify page with the code (if returned for test) or just the email
        navigate('/verify', { 
          state: { 
            whatsapp: formData.whatsapp, 
            email: formData.email,
            testCode: result.testCode // In case email fails, server returns code for testing
          } 
        });
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="card p-8">
        <h2 className="text-3xl font-bold mb-2 text-center text-primary">
          {type === 'login' ? 'Bon retour !' : 'Rejoignez-nous'}
        </h2>
        <p className="text-gray-500 text-center mb-2">
          {type === 'login' ? 'Connectez-vous à votre compte SODJA GATE' : 'Créez votre compte en quelques secondes'}
        </p>
        <div className="text-center mb-8">
          <span className="text-[10px] text-primary font-bold bg-primary/5 px-2 py-0.5 rounded-full uppercase tracking-widest">Version 1.2.0 (Serverless)</span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Ex: Jean Dupont"
                  value={formData.nom}
                  onChange={e => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Votre Quartier</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Ex: Agoè, Adidogomé..."
                  value={formData.quartier}
                  onChange={e => setFormData({ ...formData, quartier: e.target.value })}
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro WhatsApp</label>
            <input 
              type="tel" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Ex: +228 00 00 00 00"
              value={formData.whatsapp}
              onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Ex: jean@example.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
            {type === 'login' && (
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-xs text-primary font-bold hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
            )}
          </div>
          {type === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn btn-primary py-4 mt-4"
          >
            {loading ? 'Chargement...' : type === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-gray-500 text-sm">
            {type === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}
            <Link to={type === 'login' ? '/register' : '/login'} className="ml-2 text-primary font-bold hover:underline">
              {type === 'login' ? "S'inscrire" : "Se connecter"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const ForgotPassword = () => {
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [testCode, setTestCode] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp })
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Une erreur est survenue.");
      
      if (result.testCode) setTestCode(result.testCode);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="card p-8">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-4">Code Envoyé !</h2>
          <p className="text-gray-500 mb-4">Veuillez vérifier votre boîte de réception email pour le code de récupération.</p>
          {testCode && (
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
              <p className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Code de test</p>
              <p className="text-3xl font-black text-primary tracking-[0.2em]">{testCode}</p>
            </div>
          )}
          <Link 
            to="/reset-password" 
            state={{ whatsapp }}
            className="btn btn-primary w-full"
          >
            Réinitialiser le mot de passe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="card p-8">
        <h2 className="text-2xl font-bold mb-2 text-center">Mot de passe oublié</h2>
        <p className="text-gray-500 text-center mb-8">Entrez votre numéro WhatsApp pour recevoir un code de récupération.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro WhatsApp</label>
            <input 
              type="tel" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Ex: +228 00 00 00 00"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="w-full btn btn-primary py-4">
            {loading ? 'Envoi...' : 'Envoyer le code'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-primary font-bold hover:underline">Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
};

const ResetPassword = () => {
  const location = useLocation();
  const [whatsapp, setWhatsapp] = useState(location.state?.whatsapp || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp,
          otp_code: otp,
          new_password: newPassword
        })
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Une erreur est survenue.");
      
      alert("Mot de passe réinitialisé avec succès !");
      navigate('/login');
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="card p-8">
        <h2 className="text-2xl font-bold mb-2 text-center">Réinitialisation</h2>
        <p className="text-gray-500 text-center mb-8">Entrez le code reçu et votre nouveau mot de passe.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro WhatsApp</label>
            <input 
              type="tel" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Ex: +228 00 00 00 00"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code de récupération</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-center font-bold tracking-[0.5em]"
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="••••••••"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="w-full btn btn-primary py-4">
            {loading ? 'Réinitialisation...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Verification = () => {
  const location = useLocation();
  const [whatsapp, setWhatsapp] = useState(location.state?.whatsapp || '');
  const [onScreenCode, setOnScreenCode] = useState(location.state?.testCode || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp) {
      setError("Numéro WhatsApp manquant.");
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp,
          otp_code: otp
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Code incorrect ou expiré.');

      alert("Compte vérifié avec succès ! Vous pouvez maintenant vous connecter.");
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Vérification</h2>
        <p className="text-gray-500 mb-4">
          Veuillez entrer le code de vérification.
        </p>

        {onScreenCode && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <p className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Votre code de vérification</p>
            <p className="text-3xl font-black text-primary tracking-[0.2em]">{onScreenCode}</p>
            <p className="text-[10px] text-gray-400 mt-2 italic">Utilisez ce code si vous ne recevez pas l'email.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle size={18} /> {error}
          </div>
        )}
        
        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code de vérification</label>
            <input 
              type="text" 
              required
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-center font-bold tracking-[0.5em]"
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="w-full btn btn-primary py-4">
            {loading ? 'Vérification...' : 'Vérifier mon compte'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Reservations = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ product_name: '', quantity: 1, date: '', time: '', location: '', comment: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Erreur lors de la réservation');

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur lors de la réservation.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-3xl font-bold mb-4">Réservation Reçue !</h2>
        <p className="text-gray-500 mb-8">Nous vous contacterons bientôt pour confirmer votre réservation.</p>
        <Link to="/" className="btn btn-primary">Retour à l'accueil</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Réserver pour un événement</h1>
        <p className="text-gray-500">Mariages, anniversaires ou réunions, nous nous occupons de tout.</p>
      </div>
      <div className="card p-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Produit souhaité</label>
            <select 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary"
              value={formData.product_name}
              onChange={e => setFormData({ ...formData, product_name: e.target.value })}
            >
              <option value="">Sélectionnez un produit</option>
              <option value="Soja simple (fromage)">Soja simple (fromage)</option>
              <option value="Soja + spaghetti">Soja + spaghetti</option>
              <option value="Soja + spaghetti + saucisses">Soja + spaghetti + saucisses</option>
              <option value="Saucisses simples">Saucisses simples</option>
              <option value="Grain de soja (un bol)">Grain de soja (un bol)</option>
              <option value="Lait de soja (verre)">Lait de soja (verre)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
            <input 
              type="number" 
              min="1"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input 
              type="date" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
            <input 
              type="time" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary"
              value={formData.time}
              onChange={e => setFormData({ ...formData, time: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de livraison</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary"
              placeholder="Ex: Quartier Adidogomé"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaires particuliers</label>
            <textarea 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary h-32"
              placeholder="Précisez vos besoins..."
              value={formData.comment}
              onChange={e => setFormData({ ...formData, comment: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={loading} className="w-full btn btn-primary py-4">
              {loading ? 'Envoi...' : 'Confirmer la réservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Investment = () => {
  const [formData, setFormData] = useState({ name: '', whatsapp: '', email: '', amount: 0, shares: 0, motivation: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const calculatedShares = Math.floor(formData.amount / 1000);
    if (calculatedShares !== formData.shares) {
      setFormData(prev => ({ ...prev, shares: calculatedShares }));
    }
  }, [formData.amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Erreur lors de l\'envoi');
      
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <TrendingUp size={48} />
        </div>
        <h2 className="text-3xl font-bold mb-4">Demande Envoyée !</h2>
        <p className="text-gray-500 mb-8">Votre demande d'achat d'actions est en cours d'étude par notre équipe financière.</p>
        <Link to="/" className="btn btn-primary">Retour à l'accueil</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">Opportunité</span>
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Investissez dans l'avenir de <span className="text-primary">SODJA GATE</span>.</h1>
          <p className="text-gray-500 text-lg mb-8 leading-relaxed">
            Devenez actionnaire d'une entreprise en pleine croissance au Togo. 
            Participez à la révolution alimentaire locale et bénéficiez de notre succès.
          </p>
          <div className="space-y-4">
            {[
              "Dividendes annuels garantis",
              "Participation aux décisions stratégiques",
              "Soutien à l'économie locale togolaise"
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-primary">
                  <CheckCircle size={14} />
                </div>
                <span className="font-medium text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input 
                  type="tel" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary"
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant à investir (FCFA)</label>
                <input 
                  type="number" 
                  required
                  min="1000"
                  step="1000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary"
                  placeholder="Ex: 5000"
                  value={formData.amount || ''}
                  onChange={e => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                />
                <p className="text-[10px] text-gray-400 mt-1 italic">1 action = 1000 FCFA</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'actions</label>
                <input 
                  type="number" 
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 outline-none"
                  value={formData.shares}
                />
                <p className="text-[10px] text-primary mt-1 font-bold">Calculé automatiquement</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pourquoi investir ?</label>
              <textarea 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary h-24"
                value={formData.motivation}
                onChange={e => setFormData({ ...formData, motivation: e.target.value })}
              />
            </div>
            <button type="submit" disabled={loading} className="w-full btn btn-primary py-4">
              {loading ? 'Envoi...' : "Soumettre ma demande d'achat"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Suggestions = () => {
  const [formData, setFormData] = useState({ name: '', whatsapp: '', message: '', rating: 5 });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Erreur lors de l\'envoi');
      
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageSquare size={48} />
        </div>
        <h2 className="text-3xl font-bold mb-4">Merci !</h2>
        <p className="text-gray-500 mb-8">Vos suggestions nous aident à nous améliorer chaque jour.</p>
        <Link to="/" className="btn btn-primary">Retour à l'accueil</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Votre avis compte</h1>
        <p className="text-gray-500">Aidez-nous à mieux vous servir.</p>
      </div>
      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Votre Nom</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input 
                type="tel" 
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary"
                value={formData.whatsapp}
                onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (1 à 5)</label>
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                    formData.rating >= star ? "bg-secondary text-primary" : "bg-gray-100 text-gray-400"
                  )}
                >
                  <Star fill={formData.rating >= star ? "currentColor" : "none"} size={24} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Votre Message</label>
            <textarea 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary h-40"
              placeholder="Dites-nous ce que vous en pensez..."
              value={formData.message}
              onChange={e => setFormData({ ...formData, message: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading} className="w-full btn btn-primary py-4">
            {loading ? 'Envoi...' : 'Envoyer ma suggestion'}
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, orders: 0, revenue: 0 });

  useEffect(() => {
    if (!user || !user.is_admin) {
      navigate('/');
    }
  }, [user, navigate]);

  const [orders, setOrders] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'reservations' | 'investments' | 'suggestions' | 'products' | 'config' | 'supabase'>('config');
  const [notification, setNotification] = useState<string | null>(null);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [replyModal, setReplyModal] = useState<{ isOpen: boolean, userId: string, userName: string, context: string } | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, description: '', image_url: '' });
  const [smtpStatus, setSmtpStatus] = useState<{ configured: boolean, user: string } | null>(null);

  const checkSmtpStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setSmtpStatus({ configured: data.smtp_configured, user: data.smtp_user });
    } catch (err) {
      console.error(err);
    }
  }, []);

  const testEmail = async () => {
    setIsTestingEmail(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch('/api/admin/test-email', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erreur lors du test email');
      alert(result.message);
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setIsTestingEmail(false);
    }
  };

  useEffect(() => {
    if (user?.is_admin && supabase) {
      const channel = supabase
        .channel('public:orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
          setOrders(prev => [payload.new, ...prev]);
          setLiveFeed(prev => [{
            id: Date.now(),
            message: `Nouvelle commande reçue ! (${payload.new.total_amount} FCFA)`,
            time: new Date().toLocaleTimeString()
          }, ...prev]);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user?.is_admin) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    
    checkSmtpStatus();
    try {
      // Fetch Stats
      const statsRes = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch Orders
      const ordersRes = await fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData || []);
      }

      // Fetch Reservations
      const resRes = await fetch('/api/admin/reservations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resRes.ok) {
        const resData = await resRes.json();
        setReservations(resData || []);
      }

      // Fetch Investments
      const invRes = await fetch('/api/admin/investments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvestments(invData || []);
      }

      // Fetch Suggestions
      const sugRes = await fetch('/api/admin/suggestions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sugRes.ok) {
        const sugData = await sugRes.json();
        setSuggestions(sugData || []);
      }

      // Fetch Products
      const prodRes = await fetch(`/api/products?t=${Date.now()}`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData || []);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  }, [user, checkSmtpStatus]);

  const updateProductPrice = async (id: number, newPrice: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ price: newPrice })
      });
      
      if (!response.ok) throw new Error('Failed to update product');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete product');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      let response;
      if (editingProduct) {
        response = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newProduct)
        });
      } else {
        response = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newProduct)
        });
      }
      
      if (!response.ok) throw new Error('Failed to save product');
      
      setIsAddingProduct(false);
      setEditingProduct(null);
      setNewProduct({ name: '', price: 0, description: '', image_url: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateStatus = async (table: string, id: number, status: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Map table name to API endpoint
    let endpoint = '';
    if (table === 'orders') endpoint = `/api/admin/orders/${id}`;
    else if (table === 'reservations') endpoint = `/api/admin/reservations/${id}`;
    else if (table === 'investment_requests') endpoint = `/api/admin/investments/${id}`;
    else return;

    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const sendReply = async () => {
    if (!replyModal || !replyMessage.trim()) return;
    setIsSending(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: replyModal.userId,
          message: replyMessage,
          type: 'reply'
        })
      });
      
      if (!response.ok) throw new Error('Failed to send reply');
      
      setReplyMessage('');
      setReplyModal(null);
      alert("Réponse envoyée avec succès !");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur lors de l'envoi.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="py-8 space-y-8 relative">
      <div className="bg-blue-600 text-white p-4 rounded-2xl text-center font-black animate-pulse">
        DÉPLOIEMENT V1.2.0 - SI VOUS VOYEZ CECI EN BLEU, LE SITE EST À JOUR
      </div>
      {notification && (
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-24 right-4 z-50 bg-primary text-white p-4 rounded-2xl shadow-2xl border-4 border-white flex items-center gap-4 max-w-sm animate-bounce"
        >
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <p className="font-black text-sm uppercase tracking-wider">Alerte Immédiate</p>
            <p className="text-xs font-medium opacity-90">{notification}</p>
          </div>
          <button onClick={() => setNotification(null)} className="ml-2 opacity-50 hover:opacity-100">
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* Reply Modal */}
      <AnimatePresence>
        {replyModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Répondre à {replyModal.userName}</h3>
                <button onClick={() => setReplyModal(null)}><X size={24} /></button>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl mb-6 text-sm text-gray-500 italic">
                Contexte: {replyModal.context}
              </div>
              <textarea 
                className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-primary h-40 mb-6"
                placeholder="Votre message immédiat au client..."
                value={replyMessage}
                onChange={e => setReplyMessage(e.target.value)}
              />
              <div className="flex gap-4">
                <button onClick={() => setReplyModal(null)} className="flex-1 btn bg-gray-100 text-gray-600">Annuler</button>
                <button 
                  onClick={sendReply} 
                  disabled={isSending || !replyMessage.trim()}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                >
                  {isSending ? 'Envoi...' : <><Zap size={18} /> Envoyer</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tableau de Bord Admin <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full ml-2">v1.2.0</span></h1>
          <div className="flex items-center gap-3 mt-2">
            {smtpStatus && (
              <div className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider",
                smtpStatus.configured ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"
              )}>
                SMTP: {smtpStatus.configured ? `ACTIF (${smtpStatus.user})` : 'NON CONFIGURÉ'}
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-100">
              <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
              LIVE MONITORING
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={testEmail}
            disabled={isTestingEmail}
            className="flex-1 md:flex-none btn bg-primary text-white hover:bg-primary/90 flex items-center justify-center gap-2 text-sm font-bold py-3 px-6 transition-all shadow-lg shadow-primary/20 border-2 border-white"
          >
            <Mail size={18} className={isTestingEmail ? "animate-bounce" : ""} /> 
            {isTestingEmail ? 'Envoi en cours...' : 'TESTER EMAIL (CLIQUEZ ICI)'}
          </button>
          
          {activeTab === 'products' && (
            <button 
              onClick={() => setIsAddingProduct(true)}
              className="flex-1 md:flex-none btn btn-primary flex items-center justify-center gap-2 py-3 px-6 shadow-lg shadow-primary/20"
            >
              <Plus size={20} /> Nouveau Produit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Stats & Tabs */}
        <div className="lg:col-span-3 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: "Utilisateurs", value: stats.users, icon: <Users className="text-blue-500" /> },
              { label: "Commandes", value: stats.orders, icon: <ShoppingBag className="text-primary" /> },
              { label: "Revenu Total", value: `${stats.revenue} FCFA`, icon: <TrendingUp className="text-green-500" /> }
            ].map((stat, i) => (
              <div key={i} className="card p-6 flex items-center gap-6">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
                  {React.cloneElement(stat.icon as React.ReactElement<{ size: number }>, { size: 28 })}
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'orders', label: 'Commandes', icon: <ShoppingBag size={18} /> },
              { id: 'reservations', label: 'Réservations', icon: <Calendar size={18} /> },
              { id: 'investments', label: 'Investissements', icon: <TrendingUp size={18} /> },
              { id: 'suggestions', label: 'Suggestions', icon: <MessageSquare size={18} /> },
              { id: 'products', label: 'Produits', icon: <Plus size={18} /> },
              { id: 'supabase', label: 'Supabase', icon: <Package size={18} /> },
              { id: 'config', label: 'Configuration', icon: <Mail size={18} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-6 py-4 flex items-center gap-2 font-bold transition-all border-b-2 whitespace-nowrap",
                  activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="card overflow-x-auto">
            {activeTab === 'supabase' && <AdminOrders />}
            {activeTab === 'config' ? (
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Configuration Email (SMTP)</h3>
                    <p className="text-sm text-gray-500">Gérez les notifications automatiques du système.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-green-600" /> État du Service
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Statut SMTP</span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                          smtpStatus?.configured ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {smtpStatus?.configured ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Compte Utilisé</span>
                        <span className="text-sm font-mono text-gray-800">{smtpStatus?.user || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Serveur</span>
                        <span className="text-sm font-mono text-gray-800">smtp.gmail.com</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <Zap size={18} className="text-primary" /> Actions Rapides
                    </h4>
                    <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                      Utilisez le bouton ci-dessous pour envoyer un email de test à <strong>sodjagate@gmail.com</strong> et <strong>sodjagatecommande@gmail.com</strong>.
                    </p>
                    <button 
                      onClick={testEmail}
                      disabled={isTestingEmail}
                      className="w-full btn btn-primary flex items-center justify-center gap-3 py-4 shadow-xl shadow-primary/20"
                    >
                      <Mail size={20} className={isTestingEmail ? "animate-bounce" : ""} />
                      {isTestingEmail ? 'Envoi du test...' : 'Envoyer un Email de Test'}
                    </button>
                  </div>
                </div>

                {!smtpStatus?.configured && (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl">
                    <div className="flex items-start gap-4">
                      <AlertCircle className="text-amber-600 shrink-0 mt-1" size={24} />
                      <div>
                        <h4 className="font-bold text-amber-900 mb-1">SMTP Non Configuré</h4>
                        <p className="text-sm text-amber-800 leading-relaxed">
                          Le système ne peut pas envoyer d'emails automatiquement. Veuillez configurer les variables <strong>SMTP_USER</strong> et <strong>SMTP_PASS</strong> dans les Secrets de l'interface AI Studio.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
                <tr>
                  <th className="px-6 py-4">Client / Quartier</th>
                  <th className="px-6 py-4">Détails</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeTab === 'orders' && orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold">{order.user_name}</div>
                      <div className="text-xs text-primary font-medium">{order.user_quartier || 'N/A'}</div>
                      <div className="text-xs text-gray-400">{order.user_whatsapp}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-primary">{order.total_amount} FCFA</div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold">{order.payment_method}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        order.status === 'Confirmé' ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select 
                          className="text-sm border rounded p-1"
                          onChange={(e) => updateStatus('orders', order.id, e.target.value)}
                          value={order.status}
                        >
                          <option value="En attente">En attente</option>
                          <option value="Confirmé">Confirmé</option>
                          <option value="En cours de livraison">En cours de livraison</option>
                          <option value="Livré">Livré</option>
                          <option value="Annulé">Annulé</option>
                        </select>
                        <button 
                          onClick={() => setReplyModal({ 
                            isOpen: true, 
                            userId: order.user_id, 
                            userName: order.user_name,
                            context: `Commande #${order.id} de ${order.total_amount} FCFA`
                          })}
                          className="p-1 text-primary hover:bg-primary/10 rounded"
                          title="Répondre immédiatement"
                        >
                          <Zap size={16} />
                        </button>
                        <a 
                          href={`https://wa.me/${order.user_whatsapp.replace(/\+/g, '')}?text=Bonjour ${order.user_name}, c'est SODJA GATE concernant votre commande de ${order.total_amount} FCFA.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <MessageSquare size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeTab === 'reservations' && reservations.map(res => (
                  <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold">{res.user_name}</div>
                      <div className="text-xs text-gray-400">{res.user_whatsapp}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{res.product_name}</div>
                      <div className="text-xs text-gray-400">Qté: {res.quantity} | {res.location}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{res.date} à {res.time}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600">
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select 
                          className="text-sm border rounded p-1"
                          onChange={(e) => updateStatus('reservations', res.id, e.target.value)}
                          value={res.status}
                        >
                          <option value="En attente">En attente</option>
                          <option value="Confirmée">Confirmée</option>
                          <option value="Annulée">Annulée</option>
                        </select>
                        <button 
                          onClick={() => setReplyModal({ 
                            isOpen: true, 
                            userId: res.user_id, 
                            userName: res.user_name,
                            context: `Réservation de ${res.product_name} le ${res.date}`
                          })}
                          className="p-1 text-primary hover:bg-primary/10 rounded"
                        >
                          <Zap size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeTab === 'investments' && investments.map(inv => (
                  <tr key={inv.id}>
                    <td className="px-6 py-4">
                      <div className="font-bold">{inv.name}</div>
                      <div className="text-xs text-gray-400">{inv.whatsapp}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{inv.amount} FCFA</div>
                      <div className="text-xs text-gray-400">{inv.shares} actions</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-600">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select 
                          className="text-sm border rounded p-1"
                          onChange={(e) => updateStatus('investment_requests', inv.id, e.target.value)}
                          value={inv.status}
                        >
                          <option value="En étude">En étude</option>
                          <option value="Accepté">Accepté</option>
                          <option value="Refusé">Refusé</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeTab === 'suggestions' && suggestions.map(sug => (
                  <tr key={sug.id}>
                    <td className="px-6 py-4">
                      <div className="font-bold">{sug.name}</div>
                      <div className="text-xs text-gray-400">{sug.whatsapp}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-sm truncate">{sug.message}</div>
                      <div className="flex text-secondary mt-1">
                        {[...Array(sug.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500" colSpan={3}>{new Date(sug.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {activeTab === 'products' && products.map(prod => (
                  <tr key={prod.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={prod.image_url} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="font-bold">{prod.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary">{prod.price} FCFA</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">{prod.description}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingProduct(prod);
                            setNewProduct({
                              name: prod.name,
                              price: prod.price,
                              description: prod.description,
                              image_url: prod.image_url
                            });
                            setIsAddingProduct(true);
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded"
                          title="Modifier"
                        >
                          <Edit size={16} />
                          <span className="text-xs font-bold ml-1">Modifier</span>
                        </button>
                        <button 
                          onClick={() => deleteProduct(prod.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>

        {/* Live Feed Sidebar */}
        <div className="lg:col-span-1">
          <div className="card h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Zap size={18} className="text-secondary" />
              <h3 className="font-bold">Flux en Direct</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {liveFeed.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm italic">
                  En attente d'activité...
                </div>
              ) : (
                liveFeed.map((item, i) => (
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    key={i} 
                    className="p-3 bg-gray-50 rounded-xl border-l-4 border-primary"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-black uppercase text-primary">{item.type.replace('NEW_', '')}</span>
                      <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-700">
                      {item.user} a effectué une opération.
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddingProduct && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{editingProduct ? 'Modifier le Produit' : 'Ajouter un Produit'}</h3>
                <button onClick={() => {
                  setIsAddingProduct(false);
                  setEditingProduct(null);
                  setNewProduct({ name: '', price: 0, description: '', image_url: '' });
                }}><X size={24} /></button>
              </div>
              <form onSubmit={saveProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom du produit</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 rounded-xl border border-gray-200"
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prix (FCFA)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full p-3 rounded-xl border border-gray-200"
                    value={newProduct.price}
                    onChange={e => setNewProduct({ ...newProduct, price: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea 
                    required
                    className="w-full p-3 rounded-xl border border-gray-200 h-24"
                    value={newProduct.description}
                    onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">URL de l'image</label>
                  <input 
                    type="url" 
                    required
                    className="w-full p-3 rounded-xl border border-gray-200"
                    placeholder="https://images.unsplash.com/..."
                    value={newProduct.image_url}
                    onChange={e => setNewProduct({ ...newProduct, image_url: e.target.value })}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => {
                    setIsAddingProduct(false);
                    setEditingProduct(null);
                    setNewProduct({ name: '', price: 0, description: '', image_url: '' });
                  }} className="flex-1 btn bg-gray-100 text-gray-600">Annuler</button>
                  <button type="submit" className="flex-1 btn btn-primary">{editingProduct ? 'Mettre à jour' : 'Ajouter'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App Wrapper ---

const AppContent = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/panier" element={<Cart />} />
            <Route path="/login" element={<Auth type="login" />} />
            <Route path="/register" element={<Auth type="register" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify" element={<Verification />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/investir" element={<Investment />} />
            <Route path="/suggestions" element={<Suggestions />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
      
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-[60] w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform border-4 border-white"
          >
            <ArrowRight size={24} className="-rotate-90" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error("Error parsing cart from localStorage:", err);
      return [];
    }
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile();
    }
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Invalid response from /api/auth/me (HTML instead of JSON)");
        return;
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          setUser(null);
        }
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      if (data) {
        setUser({
          id: data.id.toString(),
          nom: data.nom,
          whatsapp: data.whatsapp,
          quartier: data.quartier,
          is_admin: data.is_admin === 1 || data.is_admin === true,
          email: data.email
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
    setSession(null);
    window.location.href = '/login';
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Erreur Critique</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary w-full">Réessayer</button>
        </div>
      </div>
    );
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <AuthContext.Provider value={{ user, session, logout }}>
      <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
        <Router>
          <AppContent />
        </Router>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}
