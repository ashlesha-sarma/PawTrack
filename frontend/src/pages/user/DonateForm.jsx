// This route now redirects to the full DriveDetail page
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
export default function DonateForm() {
  const { id } = useParams();
  const nav = useNavigate();
  useEffect(() => { nav(`/donations/${id}`, { replace: true }); }, [id]);
  return null;
}
