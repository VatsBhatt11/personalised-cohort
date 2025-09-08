import React from 'react';
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

const BuildInPublic = () => {
  return (
    <div className="p-4">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">
                <Home className="icon" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>Build in Public Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="page-heading mb-4">
        <h1 className="text-2xl font-bold">Build in Public Dashboard</h1>
        <p className="text-muted-foreground">
          View learners' Build in Public activity
        </p>
      </div>

      <BuildInPublicUserTable />
    </div>
  );
};

export default BuildInPublic;