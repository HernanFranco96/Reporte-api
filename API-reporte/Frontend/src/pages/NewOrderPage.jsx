import OrderForm from "../components/OrderForm";
import { useNavigate } from "react-router-dom";

export default function NewOrderPage() {
  const navigate = useNavigate();

  const handleCreated = () => {
    navigate("/api/orders/save");
  };

  return (
    <>
      <OrderForm onCreated={handleCreated} />
    </>
  );
}
