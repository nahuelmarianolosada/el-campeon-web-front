import Link from "next/link"
import Image from "next/image"
import { MapPin, Phone, Mail, Clock, Instagram } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/el-campeon-logo.png"
                alt="El Campeón"
                width={64}
                height={64}
                className="rounded-full"
              />
            </Link>
            <p className="text-sm text-primary-foreground/80">
              Tu librería y juguetería de confianza. Ofrecemos los mejores productos para toda la familia.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="https://www.instagram.com/libreriaelcampeon/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="Instagram Librería El Campeón"
              >
                <Instagram className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              Enlaces Rápidos
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/productos" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Todos los Productos
                </Link>
              </li>
              <li>
                <Link href="/productos?categoria=Libros" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Libros
                </Link>
              </li>
              <li>
                <Link href="/productos?categoria=Juguetes" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Juguetes
                </Link>
              </li>
              <li>
                <Link href="/carrito" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Mi Carrito
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              Contacto
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="text-primary-foreground/80">
                  <span className="block font-medium text-primary-foreground">Librería</span>
                  Güemes 901, San Salvador de Jujuy
                </span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="text-primary-foreground/80">
                  <span className="block font-medium text-primary-foreground">Juguetería</span>
                  Güemes 1045, San Salvador de Jujuy
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <span className="text-primary-foreground/80">
                  <span className="font-medium text-primary-foreground">Librería:</span> 388 - 4231163
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <span className="text-primary-foreground/80">
                  <span className="font-medium text-primary-foreground">Juguetería:</span> 388 - 4228261
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="text-primary-foreground/80">info@elcampeon.com</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              Horarios
            </h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Lun - Vie: 9:00 - 19:00</span>
              </li>
              <li className="pl-6">Sáb: 9:00 - 13:00</li>
              <li className="pl-6">Dom: Cerrado</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/20 pt-8 text-center text-sm text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} El Campeón - Librería y Juguetería. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
