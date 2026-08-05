const carousels = document.querySelectorAll("[data-carousel]");

carousels.forEach((carousel) => {
  const slides = Array.from(carousel.querySelectorAll(".slide"));
  const previous = carousel.querySelector("[data-prev]");
  const next = carousel.querySelector("[data-next]");
  const counter = carousel.querySelector("[data-counter]");
  let index = 0;

  const render = () => {
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === index);
    });
    counter.textContent = `${index + 1} / ${slides.length}`;
  };

  previous.addEventListener("click", () => {
    index = (index - 1 + slides.length) % slides.length;
    render();
  });

  next.addEventListener("click", () => {
    index = (index + 1) % slides.length;
    render();
  });

  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      previous.click();
    }
    if (event.key === "ArrowRight") {
      next.click();
    }
  });

  carousel.tabIndex = 0;
  render();
});
