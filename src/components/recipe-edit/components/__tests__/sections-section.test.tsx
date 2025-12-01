import { render, screen, fireEvent } from "@testing-library/react";
import { SectionsSection } from "../sections-section";

const baseSection = {
  id: "section-1",
  title: "Prep",
  ingredients: [],
  instructions: "Mix well",
};

describe("SectionsSection", () => {
  it("updates section title and hides remove when only one section", () => {
    const handleChange = jest.fn();

    render(
      <SectionsSection
        sections={[baseSection]}
        onChange={handleChange}
        onAddSection={jest.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /removeSection/i })).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("sectionTitle"), {
      target: { value: "New title" },
    });

    expect(handleChange).toHaveBeenCalledWith([
      expect.objectContaining({ title: "New title" }),
    ]);
  });

  it("allows removing additional sections", () => {
    const handleChange = jest.fn();

    render(
      <SectionsSection
        sections={[baseSection, { ...baseSection, id: "section-2" }]}
        onChange={handleChange}
        onAddSection={jest.fn()}
      />
    );

    const removeButtons = screen.getAllByRole("button", { name: /removeSection/i });
    fireEvent.click(removeButtons[1]);

    expect(handleChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: "section-1" }),
    ]);
  });

  it("invokes add section callback", () => {
    const handleAdd = jest.fn();

    render(
      <SectionsSection
        sections={[baseSection]}
        onChange={jest.fn()}
        onAddSection={handleAdd}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "addSection" }));

    expect(handleAdd).toHaveBeenCalledTimes(1);
  });
});
