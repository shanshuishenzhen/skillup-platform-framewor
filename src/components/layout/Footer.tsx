const Footer = () => {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="container mx-auto px-4 py-6 text-center text-gray-500">
        <p>&copy; {new Date().getFullYear()} SkillUp. All Rights Reserved.</p>
        <p className="text-sm mt-2">一个由AI驱动的技能提升平台</p>
      </div>
    </footer>
  );
};

export default Footer;
