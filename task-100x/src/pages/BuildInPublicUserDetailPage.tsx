import { useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import UserStatsCards from "@/components/BuildInPublic/UserStatsCards";
import StreakCalendar from "@/components/BuildInPublic/StreakCalendar";
import { useEffect, useState } from "react";
import axios from "axios";

const BuildInPublicUserDetailPage = () => {
  const { userId } = useParams();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const response = await axios.get(`/api/build-in-public/users/${userId}/name`);
        setUserName(response.data.name);
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    };

    if (userId) {
      fetchUserName();
    }
  }, [userId]);

  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb
          items={[
            { label: "Build in Public", link: "/admin/track-100x" },
            { label: userName || "User Details", link: `/admin/track-100x/${userId}` },
          ]}
        />
        <h1 className="text-2xl font-bold mb-4">{userName || "User"} Analytics</h1>
        <UserStatsCards userId={userId} />
        <StreakCalendar userId={userId} />
      </div>
    </AppLayout>
  );
};

export default BuildInPublicUserDetailPage;