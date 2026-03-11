import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { motion } from 'framer-motion';
import { Package, RefreshCw, AlertCircle } from 'lucide-react';

interface Order {
  id: string | number;
  product: string;
  price: number;
  created_at: string;
}

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error("Erreur chargement commandes:", err);
      setError(err.message || "Une erreur est survenue lors du chargement des commandes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Package className="text-primary" size={32} />
          Commandes Supabase
        </h2>
        <button 
          onClick={loadOrders}
          disabled={loading}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Rafraîchir"
        >
          <RefreshCw className={`${loading ? 'animate-spin' : ''}`} size={24} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <RefreshCw className="animate-spin mb-4" size={40} />
          <p>Chargement des commandes...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Package className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">Aucune commande trouvée dans la table "orders".</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{order.product}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="text-xl font-bold text-primary">
                  {order.price.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
