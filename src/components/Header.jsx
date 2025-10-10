// src/components/Header.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import copy from "../copy";

const Tab = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      [
        "px-5 py-2 text-sm md:text-base font-semibold transition",
        "rounded-xl", // menos redondo
        isActive
          ? "bg-amber-400 text-slate-900 shadow"
          : "text-slate-700 hover:text-slate-900",
      ].join(" ")
    }
  >
    {children}
  </NavLink>
);

export default function Header() {
  return (
    <header className="w-full bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Tabs a la izquierda */}
        <nav className="flex items-center gap-2">
          <Tab to="/">{copy.nav.inicio}</Tab>
          <Tab to="/app">{copy.nav.comparador}</Tab>
          <Tab to="/fixture">{copy.nav.partidos}</Tab>
        </nav>

        {/* Login a la derecha */}
        <NavLink
          to="/login"
          className={({ isActive }) =>
            [
              "px-4 py-2 rounded-xl font-semibold transition",
              isActive
                ? "bg-amber-400 text-slate-900"
                : "text-slate-700 hover:text-slate-900",
            ].join(" ")
          }
        >
          {copy.nav.login}
        </NavLink>
      </div>
    </header>
  );
}
