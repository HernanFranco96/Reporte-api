import { useNavigate } from "react-router-dom";
import OrderForm from "../components/OrderForm";

export default function NewOrderPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/", { state: { refresh: true } });
  };

  return <OrderForm onSuccess={handleSuccess} />;
}
