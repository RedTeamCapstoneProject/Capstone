import jQuery from "jquery";
import breakpoints from "./breakpoints";
import "./util"; // Load jQuery plugins

(function ($: JQueryStatic) {
  const $window = $(window);
  const $body = $("body");
  const $menu = $("#menu");
  const $sidebar = $("#sidebar");
  const $main = $("#main");

  // Breakpoints
  breakpoints({
    xlarge: ["1281px", "1680px"],
    large: ["981px", "1280px"],
    medium: ["737px", "980px"],
    small: ["481px", "736px"],
    xsmall: [null as any, "480px"],
  });

  // Play initial animations
  $window.on("load", () => {
    window.setTimeout(() => {
      $body.removeClass("is-preload");
    }, 100);
  });

  // Menu
  $menu.appendTo($body).panel({
    delay: 500,
    hideOnClick: true,
    hideOnSwipe: true,
    resetScroll: true,
    resetForms: true,
    side: "right",
    target: $body,
    visibleClass: "is-menu-visible",
  });

  // Menu toggle
  $body.on("click", '[href="#menu"]', (event) => {
    event.preventDefault();
    $body.toggleClass("is-menu-visible");
  });

  // Search (header)
  const $search = $("#search");
  const $search_input = $search.find("input");

  $body.on("click", '[href="#search"]', (event) => {
    event.preventDefault();
    if (!$search.hasClass("visible")) {
      ($search[0] as HTMLFormElement).reset();
      $search.addClass("visible");
      $search_input.focus();
    }
  });

  $search_input
    .on("keydown", (event) => {
      if (event.keyCode === 27) $search_input.blur();
    })
    .on("blur", () => {
      window.setTimeout(() => {
        $search.removeClass("visible");
      }, 100);
    });

  // Intro repositioning
  const $intro = $("#intro");

  breakpoints.on("<=large", () => {
    $intro.prependTo($main);
  });

  breakpoints.on(">large", () => {
    $intro.prependTo($sidebar);
  });

  // Forgot Password Form Handler
  const $forgotPasswordForm = $("#forgot-password-form");

  if ($forgotPasswordForm.length === 0) {
    console.warn("Forgot password form not found");
  }

  // Forgot Password Form Handler (delegated binding)
$(document).on("submit", "#forgot-password-form", async (event) => {
  event.preventDefault();
  event.stopPropagation();
  console.log("[forgot-password] submit intercepted");

  const $form = $(event.currentTarget as HTMLFormElement);
  const email = (($form.find('input[name="email"]').val() as string) || "").trim().toLowerCase();

  if (!email) {
    alert("Please enter your email address");
    return;
  }

  const apiBaseUrl = (window as any).API_BASE_URL ||
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:3001"
      : "");

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (response.ok) {
      alert("If an account with this email exists, a password reset link has been sent.");
      ($form[0] as HTMLFormElement).reset();
      window.location.hash = "#login-popup";
    } else {
      alert(result.error || "An error occurred. Please try again.");
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    alert("An error occurred. Please try again.");
  }
});

  // Reset Password Form Handler
  $(document).on("submit", "#reset-password-form", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const $form = $(event.currentTarget as HTMLFormElement);
    const password = (($form.find('input[name="password"]').val() as string) || "");
    const confirmPassword = (($form.find('input[name="confirm-password"]').val() as string) || "");
    const $message = $("#reset-password-message");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      $message.text("Invalid or missing reset token. Please request a new password reset link.").removeClass("success").addClass("error").show();
      return;
    }

    if (password.length < 8) {
      $message.text("Password must be at least 8 characters.").removeClass("success").addClass("error").show();
      return;
    }

    if (password !== confirmPassword) {
      $message.text("Passwords do not match.").removeClass("success").addClass("error").show();
      return;
    }

    const submitBtn = $form.find('input[type="submit"]');
    submitBtn.val("Resetting...").prop("disabled", true);

    const apiBaseUrl = (window as any).API_BASE_URL ||
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3001"
        : "");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const result = await response.json();

      if (response.ok) {
        $message.text("Your password has been reset. Redirecting to home...").removeClass("error").addClass("success").show();
        ($form[0] as HTMLFormElement).reset();
        window.setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        $message.text(result.error || "An error occurred. Please try again.").removeClass("success").addClass("error").show();
        submitBtn.val("Reset Password").prop("disabled", false);
      }
    } catch (error) {
      console.error("Reset password error:", error);
      $message.text("An error occurred. Please try again.").removeClass("success").addClass("error").show();
      submitBtn.val("Reset Password").prop("disabled", false);
    }
  });
})(jQuery);