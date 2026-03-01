"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeNotifications,
  getDocuments as getDocumentsDB,
  getClients as getClientsDB,
  getProducts as getProductsDB,
  getReminders as getRemindersDB,
  getDepensesDB,
} from "@/lib/supabase/data";
import {
  getDocuments as getDocumentsLS,
  getClients as getClientsLS,
  getProducts as getProductsLS,
  getReminders as getRemindersLS,
} from "@/lib/local-storage";
import { getDepenses as getDepensesLS } from "@/lib/depenses";
import type { AppNotification } from "@/lib/supabase/data";
import type { Document as Doc, Client, Product, Reminder, Depense } from "@/types/database";

interface AppContextValue {
  userName: string;
  userEmail: string;
  notifications: AppNotification[];
  documents: Doc[];
  clients: Client[];
  products: Product[];
  reminders: Reminder[];
  depenses: Depense[];
  dataLoading: boolean;
  refreshDocuments: () => Promise<void>;
  refreshClients: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshReminders: () => Promise<void>;
  refreshDepenses: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
  userName: "Utilisateur",
  userEmail: "",
  notifications: [],
  documents: [],
  clients: [],
  products: [],
  reminders: [],
  depenses: [],
  dataLoading: true,
  refreshDocuments: async () => {},
  refreshClients: async () => {},
  refreshProducts: async () => {},
  refreshReminders: async () => {},
  refreshDepenses: async () => {},
});

export function useAppContext() {
  return useContext(AppContext);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState("Utilisateur");
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const refreshDocuments = useCallback(async () => {
    try {
      const data = await getDocumentsDB();
      setDocuments(data.length > 0 ? data : getDocumentsLS());
    } catch {
      setDocuments(getDocumentsLS());
    }
  }, []);

  const refreshClients = useCallback(async () => {
    try {
      const data = await getClientsDB();
      setClients(data.length > 0 ? data : getClientsLS());
    } catch {
      setClients(getClientsLS());
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      const data = await getProductsDB();
      setProducts(data.length > 0 ? data : getProductsLS());
    } catch {
      setProducts(getProductsLS());
    }
  }, []);

  const refreshReminders = useCallback(async () => {
    try {
      const data = await getRemindersDB();
      setReminders(data.length > 0 ? data : getRemindersLS());
    } catch {
      setReminders(getRemindersLS());
    }
  }, []);

  const refreshDepenses = useCallback(async () => {
    try {
      const data = await getDepensesDB();
      setDepenses(data);
    } catch {
      const ls = await getDepensesLS();
      setDepenses(ls);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserName(
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "Utilisateur",
        );
        setUserEmail(session.user.email || "");
      }
    });

    Promise.all([
      getDocumentsDB().catch(() => null),
      getClientsDB().catch(() => null),
      getProductsDB().catch(() => null),
      getRemindersDB().catch(() => null),
      computeNotifications().catch(() => null),
      getDepensesDB().catch(() => null),
    ]).then(([docs, cls, prods, rems, notifs, deps]) => {
      setDocuments(docs && docs.length > 0 ? docs : getDocumentsLS());
      setClients(cls && cls.length > 0 ? cls : getClientsLS());
      setProducts(prods && prods.length > 0 ? prods : getProductsLS());
      setReminders(rems && rems.length > 0 ? rems : getRemindersLS());
      if (notifs) setNotifications(notifs);
      if (deps) setDepenses(deps);
      setDataLoading(false);
    });

    const channel = supabase
      .channel("app-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => {
        getDocumentsDB().then((docs) => { if (docs.length > 0) setDocuments(docs); });
        computeNotifications().then(setNotifications).catch(() => {});
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        getClientsDB().then((cls) => { if (cls.length > 0) setClients(cls); });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        getProductsDB().then((prods) => { if (prods.length > 0) setProducts(prods); });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, () => {
        getRemindersDB().then((rems) => { if (rems.length > 0) setReminders(rems); });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "depenses" }, () => {
        getDepensesDB().then(setDepenses).catch(() => {});
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <AppContext.Provider value={{
      userName, userEmail, notifications,
      documents, clients, products, reminders, depenses,
      dataLoading,
      refreshDocuments, refreshClients, refreshProducts,
      refreshReminders, refreshDepenses,
    }}>
      {children}
    </AppContext.Provider>
  );
}
