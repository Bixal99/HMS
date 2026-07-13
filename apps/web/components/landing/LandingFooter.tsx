"use client";

import Link from "next/link";
import { Globe, Mail, Phone } from "lucide-react";
import { MediCoreMark } from "@/components/brand/MediCoreMark";

export function LandingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-8 md:flex-row md:justify-between">
        <div className="flex items-start gap-3">
          <MediCoreMark className="size-10" />
          <div>
            <p className="font-semibold text-foreground">MediCore</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Hospital care with a clear patient path — appointments, visits,
              and results in one place.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="font-medium text-foreground">Explore</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                <a href="#services" className="hover:text-foreground">
                  Services
                </a>
              </li>
              <li>
                <a href="#departments" className="hover:text-foreground">
                  Departments
                </a>
              </li>
              <li>
                <a href="#doctors" className="hover:text-foreground">
                  Doctors
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-foreground">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Account</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-foreground">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Staff gateway
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Connect</p>
            <ul className="mt-2 flex gap-3 text-muted-foreground">
              <li>
                <a
                  href="#contact"
                  aria-label="Contact by email"
                  className="hover:text-foreground"
                >
                  <Mail className="size-4" />
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  aria-label="Contact by phone"
                  className="hover:text-foreground"
                >
                  <Phone className="size-4" />
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  aria-label="Hospital website contact"
                  className="hover:text-foreground"
                >
                  <Globe className="size-4" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-10 w-full max-w-[78rem] text-xs text-muted-foreground">
        © {new Date().getFullYear()} MediCore. All rights reserved.
      </p>
    </footer>
  );
}
