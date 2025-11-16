"use client";

import { cn } from "@/lib/utils";
import { Sparkles, Calendar, Code, AlertCircle, Users, MapPin } from "lucide-react";
import { DisplayCardData } from "@/types";

interface DisplayCardProps extends DisplayCardData {
  className?: string;
  iconClassName?: string;
  titleClassName?: string;
  onClick?: () => void;
  metadata?: {
    leaders?: string[];
    level?: string;
    github?: string;
    [key: string]: any;
  };
}

function getIconForType(type?: string) {
  switch (type) {
    case "event":
      return <Calendar className="size-4 text-blue-300" />;
    case "project":
      return <Code className="size-4 text-green-300" />;
    case "issue":
      return <AlertCircle className="size-4 text-orange-300" />;
    case "contributor":
      return <Users className="size-4 text-purple-300" />;
    case "chapter":
      return <MapPin className="size-4 text-pink-300" />;
    default:
      return <Sparkles className="size-4 text-blue-300" />;
  }
}

export function DisplayCard({
  className,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  link,
  type,
  iconClassName = "text-blue-500",
  titleClassName = "text-blue-500",
  onClick,
  metadata,
}: DisplayCardProps) {
  const handleClick = () => {
    if (link) {
      window.open(link, "_blank");
    }
    onClick?.();
  };

  // Get leaders/developers from metadata
  const leaders = metadata?.leaders || [];
  const leadersText = leaders.length > 0 
    ? `- by ${leaders.slice(0, 2).join(", ")}${leaders.length > 2 ? "..." : ""}`
    : null;

  return (
    <div
      className={cn(
        "relative flex h-36 w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-xl border-2 bg-muted/70 backdrop-blur-sm px-4 py-3 transition-all duration-700 after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[20rem] after:bg-gradient-to-l after:from-background after:to-transparent after:content-[''] hover:border-white/20 hover:bg-muted [&>*]:flex [&>*]:items-center [&>*]:gap-2",
        link && "cursor-pointer hover:scale-105",
        className
      )}
      onClick={handleClick}
      role={link ? "button" : undefined}
      tabIndex={link ? 0 : undefined}
      onKeyDown={(e) => {
        if (link && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div>
        <span className="relative inline-block rounded-full bg-blue-800 p-1">
          {getIconForType(type)}
        </span>
        <p className={cn("text-lg font-medium", titleClassName)}>{title}</p>
      </div>
      <p className="whitespace-nowrap text-xl overflow-hidden text-ellipsis">
        {description}
      </p>
      <p className="text-sm text-red-400 font-medium">
        {leadersText || date}
      </p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const defaultCards = [
    {
      className:
        "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className:
        "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className:
        "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <div className="grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700">
      {displayCards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  );
}
