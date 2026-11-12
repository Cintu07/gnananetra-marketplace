import Link from "next/link";
import { forwardRef, type ComponentProps, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium leading-none outline-none select-none transition-[background-color,color,box-shadow] duration-150 ease-power3-out focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0px_1px_2px_0px_rgba(24,24,27,0.3),inset_0px_1px_0px_0px_rgba(255,255,255,0.18)] hover:bg-[#B23A0A]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0px_0px_0px_1px_#D6D5D0,0px_1px_1px_0px_rgba(24,24,27,0.08)] hover:bg-muted",
        muted:
          "bg-muted text-foreground shadow-[0px_0px_0px_1px_#D6D5D0] hover:bg-[#E7E6E2]",
        subtle: "bg-[#F4F4F2] text-foreground shadow-[0px_0px_0px_1px_#D6D5D0] hover:bg-muted",
        danger:
          "bg-[#FEF2F2] text-[#B91C1C] shadow-[0px_0px_0px_1px_#FECACA] hover:bg-[#FEE2E2]",
        ghost: "text-subtle hover:bg-foreground/[0.07] hover:text-foreground",
        nav: "w-full justify-start rounded-lg text-sidebar-foreground hover:bg-foreground/[0.05] hover:text-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-primary data-[active=true]:shadow-[0px_0px_0px_1px_#D6D5D0]",
        link: "rounded-none text-foreground underline decoration-from-font underline-offset-2 hover:text-soft",
      },
      size: {
        sm: "p-[9px] text-[12px] leading-none max-lg:min-h-10 max-lg:px-3 max-lg:text-[13px]",
        md: "p-2 text-[14px] leading-none max-lg:min-h-11 max-lg:px-3",
        icon: "size-10 p-0 lg:size-[30px]",
        "icon-sm": "size-10 p-0 lg:size-6",
        none: "p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "sm" },
  },
);

type ButtonProps = VariantProps<typeof buttonVariants> &
  ComponentPropsWithoutRef<"button"> & {
    href?: ComponentProps<typeof Link>["href"];
    target?: string;
  };

// forwardRef matters on React 18: Radix `asChild` triggers (dropdowns, popovers,
// sheet close) hand this component a ref to anchor against.
const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  { variant, size, className, href, children, type = "button", ...props },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (href) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...(props as Omit<ComponentProps<typeof Link>, "href" | "className">)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type={type} className={classes} {...props}>
      {children}
    </button>
  );
});

export default Button;
