import React, { useEffect, useState } from 'react';
import BuildInPublicUserTable from '@/components/BuildInPublic/BuildInPublicUserTable';
import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getCookie } from '@/lib/cookieUtils';

const BuildInPublic = () => {
  const [cohortId, setCohortId] = useState<string | null>(null);

  useEffect(() => {
    const storedCohortId = getCookie('cohortId');
    if (storedCohortId) {
      setCohortId(storedCohortId);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-black p-4">
      <Breadcrumb className="mb-4 text-orange-500">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">
                <Home className="icon text-orange-500" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-orange-500" />
          <BreadcrumbItem>
            <BreadcrumbLink className="text-orange-500">Build in Public Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="page-heading mb-4">
        <h1 className="text-2xl font-bold text-black">Build in Public Dashboard</h1>
        <p className="text-gray-600">
          View learners' Build in Public activity
        </p>
      </div>

      {cohortId && <BuildInPublicUserTable cohortId={cohortId} />}
    </div>
  );
};

export default BuildInPublic;