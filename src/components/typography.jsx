import PropTypes from 'prop-types';

export function TypographyH1({ text }) {
  return <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">{text}</h1>;
}

TypographyH1.propTypes = {
  text: PropTypes.string.isRequired,
};

export function TypographyH2({ text }) {
  return <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">{text}</h2>;
}

TypographyH2.propTypes = {
  text: PropTypes.string.isRequired,
};

export function TypographyP({ text }) {
  return <p className="leading-7 [&:not(:first-child)]:mt-6">{text}</p>;
}

TypographyP.propTypes = {
  text: PropTypes.string.isRequired,
};
