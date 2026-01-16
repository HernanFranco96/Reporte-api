import { useEffect, useState } from "react";
import OrdersTable from "../components/OrdersTable";
import { API_URL } from "../config";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch(`http://${API_URL}:3000/api/orders`)
      .then((res) => res.json())
      .then(setOrders);
  }, []);

  return (
    <>
      <OrdersTable orders={orders} />
    </>
  );
}
